import type { AuthResponse, Credentials, User } from "@/types/auth";
import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const authApi = {
  register(credentials: Credentials): Promise<AuthResponse> {
    return apiClient.call<AuthResponse>(ENDPOINTS.auth.register, {
      body: credentials,
    });
  },

  login(credentials: Credentials): Promise<AuthResponse> {
    return apiClient.call<AuthResponse>(ENDPOINTS.auth.login, {
      body: credentials,
    });
  },

  /** `token` is passed explicitly so the mock layer can resolve the user. */
  me(token: string): Promise<User> {
    return apiClient.call<User>(ENDPOINTS.auth.me, { query: { token } });
  },
};
