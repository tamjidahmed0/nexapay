export interface CreateUserPayload {
  email: string;
  name: string;
  phone?: string;
  password: string;
  nationalId?: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}
