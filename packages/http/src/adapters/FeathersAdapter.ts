import { AuthRequest, AuthResponse } from "@agauth/core";

/**
 * FeathersJS works with services and hooks.
 */
export class FeathersAdapter {
    static toAuthRequest(context: any): AuthRequest {
        const { params } = context;
        return {
            body: context.data,
            headers: params.headers || {},
            query: params.query || {},
            ip: params.ip,
            userAgent: params.userAgent,
            cookies: params.cookies || {},
            method: "SERVICE",
            url: context.path
        };
    }

    // Feathers usually communicates via JSON, cookies are handled by top-level transport
}
