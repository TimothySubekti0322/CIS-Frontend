"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthSession, LoginCredentials, RegisterPayload, User } from "@/types/auth";
import { authApi } from "@/lib/api/auth";
import { clearSession, getToken, setSession } from "./token";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate the session from the token cookie on mount.
  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        // The api client already tried a refresh; a failure here is terminal.
        clearSession();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /** Store the new pair, then adopt the profile the auth response carried. */
  const adopt = useCallback((session: AuthSession) => {
    setSession(session.accessToken, session.refreshToken, session.expiresIn);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      adopt(await authApi.login(credentials));
    },
    [adopt],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      adopt(await authApi.register(payload));
    },
    [adopt],
  );

  const logout = useCallback(async () => {
    try {
      // Revokes every refresh token server-side; the access token is stateless
      // and stays valid until it expires, so the local copy must go too.
      await authApi.logout();
    } catch {
      /* sign out locally even if the server call fails */
    }
    clearSession();
    setUser(null);
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
