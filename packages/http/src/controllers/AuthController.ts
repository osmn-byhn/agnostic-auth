import { Request, Response } from "express";
import { Register, Login, VerifyEmail, ForgotPassword, ResetPassword, Logout } from "@agauth/core";
import { z } from "zod";
import jwt from "jsonwebtoken";

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your-access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret";

export class AuthController {
  constructor(
    private register: Register,
    private login: Login,
    private verifyEmail: VerifyEmail,
    private forgotPassword: ForgotPassword,
    private resetPassword: ResetPassword,
    private logout: Logout,
  ) { }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign({ id: userId }, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
    return { accessToken, refreshToken };
  }

  async registerHandler(req: Request, res: Response) {
    try {
      const { password, extraFields, ...credentials } = req.body;
      const user = await this.register.execute(credentials, password, extraFields);

      const csrfToken = jwt.sign({ userId: user.id }, "csrf-secret"); // Simple CSRF secret
      res.cookie("csrf-token", csrfToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

      res.status(201).json({
        user,
        csrfToken, // Return to client for header
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async loginHandler(req: Request, res: Response) {
    try {
      const { password, ...credentials } = req.body;
      const ip = req.ip;
      const device = req.headers["user-agent"];

      const user = await this.login.execute(credentials, password, ip, device);

      const { accessToken, refreshToken } = this.generateTokens(user.id);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user,
        accessToken,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async logoutHandler(req: Request, res: Response) {
    const token = (req as any).token;
    if (token) {
      // Blacklist access token until it expires
      // In real app, you might want to decode to get exp, or just use a fixed max expiration
      const decoded = jwt.decode(token) as { exp: number };
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
      await this.logout.execute(token, expiresAt);
    }

    res.clearCookie("refreshToken");
    res.clearCookie("csrf-token");
    res.status(204).send();
  }

  async verifyEmailHandler(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (typeof token !== "string") throw new Error("Token is required");
      await this.verifyEmail.execute(token);
      res.json({ message: "Email verified successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async forgotPasswordHandler(req: Request, res: Response) {
    try {
      const { extraFields, ...credentials } = req.body;
      const resetToken = await this.forgotPassword.execute(credentials);
      // In prod, resetToken should not be returned but sent via email
      res.json({ message: "If your account is registered, you will receive a reset link", debugToken: resetToken });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resetPasswordHandler(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      await this.resetPassword.execute(token, newPassword);
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async refreshTokenHandler(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

    try {
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id: string };
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(payload.id);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken });
    } catch (error) {
      res.status(403).json({ error: "Invalid refresh token" });
    }
  }
}
