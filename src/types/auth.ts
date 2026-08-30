/** The operator account. There are no roles — every authenticated user is equal. */
export interface User {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string | null;
}

/** `POST /auth/register`, `/auth/login` and `/auth/refresh` all return this. */
export interface AuthSession {
  user: User | null;
  accessToken: string;
  /** Single-use — revoked as part of the next `/auth/refresh` exchange. */
  refreshToken: string | null;
  tokenType: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginCredentials {
  name: string;
}
