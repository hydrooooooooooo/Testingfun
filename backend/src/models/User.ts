export interface User {
  id: number;
  email: string;
  password_hash?: string;
  name?: string;
  phone_number?: string;
  role: 'user' | 'admin';
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  credits: number;
  verification_token?: string;
  verification_token_expires_at?: Date;
  reset_token?: string;
  reset_token_expires_at?: Date;
  profile_image?: string;
  subscription_status: 'free' | 'premium' | 'enterprise';
  last_verification_email_sent_at?: Date | null;
  business_sector?: string;
  company_size?: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name?: string;
  phone_number: string;
  business_sector?: string;
  company_size?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}
