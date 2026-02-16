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
  // 2FA
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  twoFactorBackupCodes?: string[];
  isEmailVerified: boolean;
  // Contact info for OTP
  phoneNumber?: string;
  recoveryEmail?: string;
} & T;
