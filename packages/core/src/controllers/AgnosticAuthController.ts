import { AuthRequest, AuthResponse } from "../interfaces/AgnosticHttp";
import { Login } from "../usecases/Login";
import { Register } from "../usecases/Register";
import { TokenProvider } from "../interfaces/AuthStrategies";
import { AuthError, UnauthorizedError, InvalidCredentialsError } from "../errors/AuthErrors";
import { Logout, VerifyEmail, ForgotPassword, ResetPassword } from "../usecases/AuthUseCases";
import { SessionManager, VerifyTOTP, GenerateTOTPSecret } from "../usecases/SecurityUseCases";

export class AgnosticAuthController {
    constructor(
        private register: Register,
        private login: Login,
        private verifyEmail: VerifyEmail,
        private forgotPassword: ForgotPassword,
        private resetPassword: ResetPassword,
        private logout: Logout,
        private sessionManager: SessionManager,
        private verifyTOTP: VerifyTOTP,
        private generateTOTP: GenerateTOTPSecret,
        private rotateRefreshToken: any,
        private otpManager: any,
        private verifyOtp: any,
        private tokenProvider: TokenProvider,
        private config: {
            accessTokenSecret: string;
            refreshTokenSecret: string;
            isProduction?: boolean;
        }
    ) { }

    private async generateTokens(userId: string, req: AuthRequest) {
        const accessToken = this.tokenProvider.sign({ userId }, { expiresIn: "15m" });
        const refreshToken = this.tokenProvider.sign({ userId }, { expiresIn: "7d" });

        // Create session
        await this.sessionManager.createSession(
            userId,
            refreshToken,
            req.ip,
            req.userAgent,
            req.body.fingerprint // Expect fingerprint from client
        );

        return { accessToken, refreshToken };
    }

    async registerHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { password, extraFields, ...credentials } = req.body;
            const user = await this.register.execute(credentials, password, extraFields);

            return {
                status: 201,
                body: { user },
                cookies: [
                    {
                        name: "csrf-token",
                        value: "simple-csrf-token",
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict" }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async loginHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { password, ...credentials } = req.body;
            const user = await this.login.execute(credentials, password, req.ip, req.userAgent);

            // MFA Check
            if (user.isTwoFactorEnabled) {
                return {
                    status: 200,
                    body: {
                        mfaRequired: true,
                        tempToken: this.tokenProvider.sign({ userId: user.id, mfa: true }, { expiresIn: "5m" })
                    }
                };
            }

            const { accessToken, refreshToken } = await this.generateTokens(user.id, req);

            return {
                status: 200,
                body: { user, accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: refreshToken,
                        options: {
                            httpOnly: true,
                            secure: this.config.isProduction,
                            sameSite: "strict",
                            maxAge: 7 * 24 * 60 * 60 * 1000
                        }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verify2FAHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { code, tempToken } = req.body;
            const decoded = this.tokenProvider.verify(tempToken);
            if (!decoded.mfa) throw new UnauthorizedError();

            await this.verifyTOTP.execute(decoded.userId, code);
            const { accessToken, refreshToken } = await this.generateTokens(decoded.userId, req);

            return {
                status: 200,
                body: { accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: refreshToken,
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async refreshTokenHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) throw new UnauthorizedError("No refresh token provided");

            const { accessToken, refreshToken: newRefreshToken } = await (this as any).rotateRefreshToken.execute(
                refreshToken,
                req.ip,
                req.userAgent,
                req.body.fingerprint
            );

            return {
                status: 200,
                body: { accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: newRefreshToken,
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async generate2FAHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            // userId usually from middleware/auth req
            const { userId } = (req as any).user;
            const result = await this.generateTOTP.execute(userId);
            return {
                status: 200,
                body: result
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async sendOtpHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { type } = req.body;
            const { userId } = (req as any).user;
            await (this as any).otpManager.sendOtp(userId, type);
            return {
                status: 200,
                body: { message: `OTP sent via ${type}` }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async logoutHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const authHeader = req.headers["authorization"] as string;
            const token = authHeader?.split(" ")[1];

            if (token) {
                const decoded = this.tokenProvider.decode(token);
                const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
                await this.logout.execute(token, expiresAt);

                // Revoke current session
                const refreshToken = req.cookies?.refreshToken;
                if (refreshToken) {
                    const session = await (this.login as any).adapter.findSession({ refreshTokenHash: refreshToken });
                    if (session) await this.sessionManager.revokeSession(session.id);
                }
            }

            return {
                status: 204,
                cookies: [
                    { name: "refreshToken", value: "", options: { maxAge: 0 } },
                    { name: "csrf-token", value: "", options: { maxAge: 0 } }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async logoutAllDevicesHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { userId } = (req as any).user;
            await this.sessionManager.revokeAllUserSessions(userId);
            return { status: 204 };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verifyEmailHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token } = req.query;
            if (typeof token !== "string") throw new Error("Token is required");
            await this.verifyEmail.execute(token);
            return {
                status: 200,
                body: { message: "Email verified successfully" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async resetPasswordHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token, newPassword } = req.body;
            await this.resetPassword.execute(token, newPassword);
            return {
                status: 200,
                body: { message: "Password reset successful" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verifyOtpHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { code, type } = req.body;
            const { userId } = (req as any).user;
            await this.verifyOtp.execute(userId, code, type);
            return {
                status: 200,
                body: { message: "OTP verified" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async forgotPasswordHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { method, ...credentials } = req.body;
            const resetToken = await this.forgotPassword.execute(credentials, method);
            return {
                status: 200,
                body: { message: "If your account is registered, you will receive a reset link or code", debugToken: resetToken }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    private handleError(error: any): AuthResponse {
        const status = error instanceof AuthError ? error.status : 500;
        return {
            status,
            body: {
                error: error.message,
                code: error instanceof AuthError ? error.code : "INTERNAL_ERROR"
            }
        };
    }
}

