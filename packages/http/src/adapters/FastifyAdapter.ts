import { FastifyRequest, FastifyReply } from "fastify";
import { AuthRequest, AuthResponse } from "@agauth/core";

export class FastifyAdapter {
    static toAuthRequest(req: FastifyRequest): AuthRequest {
        return {
            body: req.body,
            headers: req.headers as { [key: string]: string },
            query: req.query as { [key: string]: string },
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            cookies: (req as any).cookies || {},
            method: req.method,
            url: req.url
        };
    }

    static fromAuthResponse(reply: FastifyReply, authRes: AuthResponse) {
        if (authRes.cookies) {
            authRes.cookies.forEach(cookie => {
                reply.setCookie(cookie.name, cookie.value, cookie.options as any);
            });
        }

        if (authRes.headers) {
            Object.entries(authRes.headers).forEach(([key, value]) => {
                reply.header(key, value);
            });
        }

        return reply.status(authRes.status).send(authRes.body);
    }

    static createHandler(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (req: FastifyRequest, reply: FastifyReply) => {
            const authReq = this.toAuthRequest(req);
            const authRes = await agnosticHandler(authReq);
            return this.fromAuthResponse(reply, authRes);
        };
    }
}
