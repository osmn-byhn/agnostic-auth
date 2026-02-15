export class AuthError extends Error {
    constructor(message: string, public status: number = 400, public code?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InvalidCredentialsError extends AuthError {
    constructor(message: string = "Invalid credentials") {
        super(message, 401, "INVALID_CREDENTIALS");
    }
}

export class AccountLockedError extends AuthError {
    constructor(message: string) {
        super(message, 403, "ACCOUNT_LOCKED");
    }
}

export class UserExistsError extends AuthError {
    constructor(message: string = "User already exists") {
        super(message, 400, "USER_EXISTS");
    }
}

export class TokenExpiredError extends AuthError {
    constructor(message: string = "Token expired") {
        super(message, 401, "TOKEN_EXPIRED");
    }
}

export class UnauthorizedError extends AuthError {
    constructor(message: string = "Unauthorized") {
        super(message, 401, "UNAUTHORIZED");
    }
}
