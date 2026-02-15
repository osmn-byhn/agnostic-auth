import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IsTokenBlacklisted } from "@agauth/core";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your-access-secret";

export const authenticate = (isTokenBlacklisted: IsTokenBlacklisted) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Access token required" });
        }

        const blacklisted = await isTokenBlacklisted.execute(token);
        if (blacklisted) {
            return res.status(403).json({ error: "Token is blacklisted" });
        }

        jwt.verify(token, ACCESS_TOKEN_SECRET, (err: any, user: any) => {
            if (err) {
                return res.status(403).json({ error: "Invalid or expired token" });
            }
            (req as any).user = user;
            (req as any).token = token; // Store token for logout
            next();
        });
    };
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    const csrfToken = req.headers["x-csrf-token"];
    const cookieCsrf = req.cookies["csrf-token"];

    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
        return next();
    }

    if (!csrfToken || csrfToken !== cookieCsrf) {
        return res.status(403).json({ error: "Invalid CSRF token" });
    }

    next();
};
