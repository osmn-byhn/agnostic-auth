import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * LoopBack 4 uses a specific context and dependency injection.
 */
export class LoopBackAdapter {
    static toAuthRequest(request: any): AuthRequest {
        return {
            body: request.body,
            headers: request.headers,
            query: request.query,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            cookies: request.cookies || {},
            method: request.method,
            url: request.url
        };
    }

    static fromAuthResponse(response: any, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(c => response.cookie(c.name, c.value, c.options));
        }
        response.status(authRes.status).send(authRes.body);
    }
}
