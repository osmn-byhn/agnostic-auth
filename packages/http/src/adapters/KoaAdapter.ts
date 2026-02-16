import { Context, Next } from "koa";
import { AuthRequest, AuthResponse } from "@agauth/core";

export class KoaAdapter {
    static toAuthRequest(ctx: Context): AuthRequest {
        return {
            body: ctx.request.body,
            headers: ctx.headers as { [key: string]: string },
            query: ctx.query as { [key: string]: string },
            ip: ctx.ip,
            userAgent: ctx.get("user-agent"),
            cookies: this.parseCookies(ctx.get("cookie")),
            method: ctx.method,
            url: ctx.url
        };
    }

    private static parseCookies(cookieHeader: string | undefined): { [key: string]: string } {
        if (!cookieHeader) return {};
        const cookies: { [key: string]: string } = {};
        cookieHeader.split(";").forEach(cookie => {
            const [name, ...rest] = cookie.split("=");
            if (name && rest.length > 0) {
                cookies[name.trim()] = rest.join("=").trim();
            }
        });
        return cookies;
    }

    static fromAuthResponse(ctx: Context, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(cookie => {
                ctx.cookies.set(cookie.name, cookie.value, (cookie.options || {}) as any);
            });
        }

        if (authRes.headers) {
            Object.entries(authRes.headers).forEach(([key, value]) => {
                ctx.set(key, value);
            });
        }

        ctx.status = authRes.status;
        ctx.body = authRes.body;
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (ctx: Context, next: Next) => {
            const authReq = this.toAuthRequest(ctx);

            const authRes = await agnosticHandler(authReq);
            this.fromAuthResponse(ctx, authRes);
        };
    }
}
