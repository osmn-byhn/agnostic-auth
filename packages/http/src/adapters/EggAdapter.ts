import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * Egg.js uses a context similar to Koa.
 */
export class EggAdapter {
    static toAuthRequest(ctx: any): AuthRequest {
        return {
            body: ctx.request.body,
            headers: ctx.headers,
            query: ctx.query,
            ip: ctx.ip,
            userAgent: ctx.get("user-agent"),
            cookies: ctx.cookies ? {} : {}, // ctx.cookies.get
            method: ctx.method,
            url: ctx.url
        };
    }

    static fromAuthResponse(ctx: any, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(c => ctx.cookies.set(c.name, c.value, c.options));
        }
        ctx.status = authRes.status;
        ctx.body = authRes.body;
    }
}
