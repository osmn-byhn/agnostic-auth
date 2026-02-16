import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * Sails.js follows Express but with some differences in req/res decoration.
 */
export class SailsAdapter {
    static toAuthRequest(req: any): AuthRequest {
        return {
            body: req.body,
            headers: req.headers,
            query: req.allParams ? req.allParams() : req.query,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            cookies: req.cookies || {},
            method: req.method,
            url: req.url
        };
    }

    static fromAuthResponse(res: any, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(c => res.cookie(c.name, c.value, c.options));
        }
        return res.status(authRes.status).json(authRes.body);
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (req: any, res: any) => {
            const authReq = this.toAuthRequest(req);
            const authRes = await agnosticHandler(authReq);
            return this.fromAuthResponse(res, authRes);
        };
    }
}
