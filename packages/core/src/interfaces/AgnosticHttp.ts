export interface AuthRequest {
    body: any;
    headers: { [key: string]: string | string[] | undefined };
    query: { [key: string]: string | string[] | undefined };
    ip?: string;
    userAgent?: string;
    cookies: { [key: string]: string | undefined };
    method: string;
    url: string;
}

export interface AuthResponse {
    status: number;
    body?: any;
    cookies?: {
        name: string;
        value: string;
        options?: {
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: "strict" | "lax" | "none";
            maxAge?: number;
            path?: string;
        };
    }[];
    headers?: { [key: string]: string };
}
