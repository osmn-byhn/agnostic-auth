import { AuthRequest, AuthResponse } from "../interfaces/AgnosticHttp";
import { Login } from "../usecases/Login";
import { Register } from "../usecases/Register";
import { TokenProvider } from "../interfaces/AuthStrategies";
import { AuthError } from "../errors/AuthErrors";
import { Logout, VerifyEmail, ForgotPassword, ResetPassword } from "../usecases/AuthUseCases";

export class AgnosticAuthController {
    constructor(
        private register: Register,
        private login: Login,
        private verifyEmail: VerifyEmail,
        private forgotPassword: ForgotPassword,
        private resetPassword: ResetPassword,
        private logout: Logout,
        private tokenProvider: TokenProvider,
        private config: {
            accessTokenSecret: string;
            refreshTokenSecret: string;
            isProduction?: boolean;
        }
    ) { }

    private generateTokens(userId: string) {
        const accessToken = this.tokenProvider.sign({ userId }, { expiresIn: "15m" });
        const refreshToken = this.tokenProvider.sign({ userId }, { expiresIn: "7d" });
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
                        value: "simple-csrf-token", // In real apps, generate properly
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

            const { accessToken, refreshToken } = this.generateTokens(user.id);

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

    async logoutHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const authHeader = req.headers["authorization"] as string;
            const token = authHeader?.split(" ")[1];

            if (token) {
                const decoded = this.tokenProvider.decode(token);
                const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
                await this.logout.execute(token, expiresAt);
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

    async forgotPasswordHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { ...credentials } = req.body;
            const resetToken = await this.forgotPassword.execute(credentials);
            return {
                status: 200,
                body: { message: "If your account is registered, you will receive a reset link", debugToken: resetToken }
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
