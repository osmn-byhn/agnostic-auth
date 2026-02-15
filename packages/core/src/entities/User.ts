export type User<T = { [key: string]: any }> = {
  id: string;
  passwordHash: string;
  createdAt: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lockedUntil?: Date;
  failedLoginAttempts: number;
  lastLoginIp?: string;
  lastLoginDevice?: string;
} & T;
