import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * AdonisJS uses a specific HttpContext.
 */
export class AdonisAdapter {
    static toAuthRequest(ctx: any): AuthRequest {
        const { request } = ctx;
        return {
            body: request.body(),
            headers: request.headers(),
            query: request.qs(),
            ip: request.ip(),
            userAgent: request.header("user-agent"),
            cookies: request.cookiesList(),
            method: request.method(),
            url: request.url()
        };
    }

    static fromAuthResponse(ctx: any, authRes: AuthResponse) {
        const { response } = ctx;

        if (authRes.cookies) {
            authRes.cookies.forEach(cookie => {
                response.cookie(cookie.name, cookie.value, cookie.options);
            });
        }

        if (authRes.headers) {
            Object.entries(authRes.headers).forEach(([key, value]) => {
                response.header(key, value);
            });
        }

        return response.status(authRes.status).send(authRes.body);
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (ctx: any) => {
            const authReq = this.toAuthRequest(ctx);
            const authRes = await agnosticHandler(authReq);
            return this.fromAuthResponse(ctx, authRes);
        };
    }
}
