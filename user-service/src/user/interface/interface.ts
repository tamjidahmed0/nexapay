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


export interface LoginPayload {
  email: string;
  password: string;
  fcmToken?: string
}

export interface ForgotPassword {
  email: string;
}

export interface PassResetOtp {
  email: string;
  otp: string;
}