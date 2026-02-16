import { SetMetadata, Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable, from } from "rxjs";
import { switchMap } from "rxjs/operators";
import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * NestJS is unique. We provide an interceptor and a decorator approach.
 */
@Injectable()
export class NestAuthInterceptor implements NestInterceptor {
    constructor(private agnosticHandler: (req: AuthRequest) => Promise<AuthResponse>) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();

        const authReq: AuthRequest = {
            body: req.body,
            headers: req.headers,
            query: req.query,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            cookies: req.cookies || {},
            method: req.method,
            url: req.url
        };

        return from(this.agnosticHandler(authReq)).pipe(
            switchMap(authRes => {
                if (authRes.cookies) {
                    authRes.cookies.forEach(c => res.cookie(c.name, c.value, c.options));
                }
                res.status(authRes.status);
                return from([authRes.body]);
            })
        );
    }
}
