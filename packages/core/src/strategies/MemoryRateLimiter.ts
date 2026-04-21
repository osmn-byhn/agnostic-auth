import { RateLimiter, RateLimitRes, RateLimitOptions } from "../interfaces/RateLimiter";

export class MemoryRateLimiter implements RateLimiter {
    private store: Map<string, { points: number; lastReset: number; blockUntil?: number }> = new Map();

    constructor(private options: RateLimitOptions) { }

    async consume(key: string, points: number = 1): Promise<RateLimitRes> {
        const now = Date.now();
        let data = this.store.get(key);

        if (data && data.blockUntil && data.blockUntil > now) {
            return {
                remainingPoints: 0,
                msBeforeNext: data.blockUntil - now,
                consumedPoints: this.options.points,
                isFirstInWindow: false
            };
        }

        if (!data || (now - data.lastReset > this.options.duration * 1000)) {
            data = { points: 0, lastReset: now };
        }

        data.points += points;

        const isExceeded = data.points > this.options.points;
        let msBeforeNext = (data.lastReset + this.options.duration * 1000) - now;

        if (isExceeded) {
            if (this.options.blockDuration) {
                data.blockUntil = now + this.options.blockDuration * 1000;
                msBeforeNext = this.options.blockDuration * 1000;
            }
            this.store.set(key, data);
            throw {
                remainingPoints: 0,
                msBeforeNext,
                consumedPoints: data.points,
                isFirstInWindow: false
            };
        }

        this.store.set(key, data);

        return {
            remainingPoints: Math.max(0, this.options.points - data.points),
            msBeforeNext,
            consumedPoints: data.points,
            isFirstInWindow: data.points === points
        };
    }

    async penalty(key: string, points: number = 1): Promise<RateLimitRes> {
        return this.consume(key, points);
    }

    async reward(key: string, points: number = 1): Promise<RateLimitRes> {
        const data = this.store.get(key);
        if (data) {
            data.points = Math.max(0, data.points - points);
            this.store.set(key, data);
        }
        const now = Date.now();
        return {
            remainingPoints: data ? this.options.points - data.points : this.options.points,
            msBeforeNext: data ? (data.lastReset + this.options.duration * 1000) - now : 0,
            consumedPoints: data ? data.points : 0,
            isFirstInWindow: false
        };
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }
}
