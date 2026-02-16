import { Request, ResponseToolkit } from "@hapi/hapi";
import { AuthRequest, AuthResponse } from "@agauth/core";

export class HapiAdapter {
    static toAuthRequest(req: Request): AuthRequest {
        return {
            body: req.payload,
            headers: req.headers as { [key: string]: string },
            query: req.query as { [key: string]: string },
            ip: req.info.remoteAddress,
            userAgent: req.headers["user-agent"],
            cookies: req.state || {},
            method: req.method,
            url: req.url.toString()
        };
    }

    static fromAuthResponse(h: ResponseToolkit, authRes: AuthResponse) {
        let response = h.response(authRes.body).code(authRes.status);

        if (authRes.cookies) {
            authRes.cookies.forEach(cookie => {
                response.state(cookie.name, cookie.value, cookie.options as any);
            });
        }

        if (authRes.headers) {
            Object.entries(authRes.headers).forEach(([key, value]) => {
                response.header(key, value);
            });
        }

        return response;
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (req: Request, h: ResponseToolkit) => {
            const authReq = this.toAuthRequest(req);
            const authRes = await agnosticHandler(authReq);
            return this.fromAuthResponse(h, authRes);
        };
    }
}

