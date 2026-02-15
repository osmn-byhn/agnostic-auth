import jwt from "jsonwebtoken";
import { TokenProvider } from "../interfaces/AuthStrategies";

export class JwtProvider implements TokenProvider {
    constructor(private secret: string, private options: jwt.SignOptions = {}) { }

    sign(payload: any, options?: jwt.SignOptions): string {
        return jwt.sign(payload, this.secret, { ...this.options, ...options });
    }

    verify(token: string, options?: jwt.VerifyOptions): any {
        return jwt.verify(token, this.secret, { ...options });
    }

    decode(token: string): any {
        return jwt.decode(token);
    }
}
