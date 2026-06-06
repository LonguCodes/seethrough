export interface AuthenticatedUser {
  id: string;
  sub: string;
  username: string;
  role: string;
  permissions: string[];
}