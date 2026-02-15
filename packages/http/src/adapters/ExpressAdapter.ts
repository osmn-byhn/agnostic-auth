import { Request, Response, NextFunction } from "express";
import { AuthRequest, AuthResponse } from "@agauth/core";

export class ExpressAdapter {
    static toAuthRequest(req: Request): AuthRequest {
        return {
            body: req.body,
            headers: req.headers as { [key: string]: string },
            query: req.query as { [key: string]: string },
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            cookies: req.cookies || {},
            method: req.method,
            url: req.url
        };
    }

    static fromAuthResponse(res: Response, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(cookie => {
                res.cookie(cookie.name, cookie.value, cookie.options);
            });
        }

        if (authRes.headers) {
            Object.entries(authRes.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }

        return res.status(authRes.status).json(authRes.body);
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (req: Request, res: Response) => {
            const authReq = this.toAuthRequest(req);
            const authRes = await agnosticHandler(authReq);
            return this.fromAuthResponse(res, authRes);
        };
    }
}
