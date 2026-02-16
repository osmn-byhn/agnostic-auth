export type Session = {
    id: string;
    userId: string;
    refreshTokenHash: string;
    ip?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    createdAt: Date;
    expiresAt: Date;
    isValid: boolean;
    lastActiveAt: Date;
};
