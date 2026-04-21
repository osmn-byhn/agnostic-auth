export interface RateLimitRes {
    remainingPoints: number;
    msBeforeNext: number;
    consumedPoints: number;
    isFirstInWindow: boolean;
}

export interface RateLimitOptions {
    points: number; // Number of points
    duration: number; // Window duration in seconds
    blockDuration?: number; // How long to block if points exceeded (seconds)
}

export interface RateLimitStore {
    get(key: string): Promise<RateLimitRes | null>;
    set(key: string, points: number, duration: number): Promise<void>;
    consume(key: string): Promise<RateLimitRes>;
    delete(key: string): Promise<void>;
}

export interface RateLimiter {
    consume(key: string, points?: number): Promise<RateLimitRes>;
    penalty(key: string, points?: number): Promise<RateLimitRes>;
    reward(key: string, points?: number): Promise<RateLimitRes>;
    delete(key: string): Promise<void>;
}
