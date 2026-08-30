import type {
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/types/auth";
import { apiClient } from "./client";
import type { AuthSessionDto, UserDto } from "./dto";
import { ENDPOINTS } from "./endpoints";
import { mapAuthSession, mapUser } from "./mappers";

export const authApi = {
  /**
   * `POST /auth/register` — creates the account and signs it in (201).
   * Returns 403 FORBIDDEN when `AUTH_ALLOW_REGISTRATION=false`.
   */
  async register(payload: RegisterPayload): Promise<AuthSession> {
    const dto = await apiClient.call<AuthSessionDto>(ENDPOINTS.auth.register, {
      body: {
        email: payload.email,
        password: payload.password,
        name: payload.name,
      },
    });
    return mapAuthSession(dto);
  },

  /**
   * `POST /auth/login`. A wrong password and an unknown email are both 401
   * and deliberately indistinguishable — surface the server's message as-is.
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const dto = await apiClient.call<AuthSessionDto>(ENDPOINTS.auth.login, {
      body: { email: credentials.email, password: credentials.password },
    });
    return mapAuthSession(dto);
  },

  /**
   * `POST /auth/refresh`. The presented token is single-use — it is revoked as
   * part of the exchange, so the new pair must be stored before the next call.
   * The api client drives this automatically on a 401; call it directly only
   * for an explicit "extend my session" action.
   */
  async refresh(refreshToken: string): Promise<AuthSession> {
    const dto = await apiClient.call<AuthSessionDto>(ENDPOINTS.auth.refresh, {
      body: { refresh_token: refreshToken },
    });
    return mapAuthSession(dto);
  },

  /** `GET /auth/me` — the calling user's profile, from the Bearer token. */
  async me(): Promise<User | null> {
    const dto = await apiClient.call<UserDto>(ENDPOINTS.auth.me);
    return mapUser(dto);
  },

  /**
   * `POST /auth/logout` — revokes every refresh token for the user.
   * The access token is stateless and stays valid until it expires, so the
   * client must drop its copy too.
   */
  async logout(): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.auth.logout);
  },
};
