export interface CreateUserPayload {
  email: string;
  name: string;
  phone?: string;
  nationalId?: string;
}