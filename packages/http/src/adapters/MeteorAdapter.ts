import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * Meteor uses Methods or WebApp.
 */
export class MeteorAdapter {
    static bridgeToWebApp(agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) {
        return async (req: any, res: any, next: any) => {
            const authReq: AuthRequest = {
                body: req.body,
                headers: req.headers,
                query: {}, // need to parse
                ip: req.connection.remoteAddress,
                userAgent: req.headers["user-agent"],
                cookies: {},
                method: req.method,
                url: req.url
            };

            const authRes = await agnosticHandler(authReq);
            res.writeHead(authRes.status, authRes.headers);
            res.end(JSON.stringify(authRes.body));
        };
    }
}
