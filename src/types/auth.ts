export interface User {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Credentials {
  username: string;
  password: string;
}
