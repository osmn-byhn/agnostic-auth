import { Router } from "express";
import {
    Register,
    Login,
    VerifyEmail,
    ForgotPassword,
    ResetPassword,
    Logout,
    IsTokenBlacklisted,
    MemoryAdapter,
    MemoryTokenBlacklistRepository,
    BcryptHasher,
    JwtProvider,
    AgnosticAuthController
} from "@agauth/core";
import { authRateLimiter } from "../middlewares/rate-limit.middleware";
import { authenticate, csrfProtection } from "../middlewares/auth.middleware";
import { ExpressAdapter } from "../adapters/ExpressAdapter";

const router = Router();

// Configuration
const identityField = process.env.AUTH_IDENTITY_FIELD || "email";
const accessSecret = process.env.ACCESS_TOKEN_SECRET || "default-access-secret";
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "default-refresh-secret";

// Injections
const userAdapter = new MemoryAdapter();
const tokenBlacklist = new MemoryTokenBlacklistRepository();
const hasher = new BcryptHasher();
const tokenProvider = new JwtProvider(accessSecret);

const registerUseCase = new Register(userAdapter, hasher, { identityField });
const loginUseCase = new Login(userAdapter, hasher, { identityField });
const verifyEmailUseCase = new VerifyEmail(userAdapter);
const forgotPasswordUseCase = new ForgotPassword(userAdapter);
const resetPasswordUseCase = new ResetPassword(userAdapter, hasher);
const logoutUseCase = new Logout(tokenBlacklist);
const isTokenBlacklistedUseCase = new IsTokenBlacklisted(tokenBlacklist);

const controller = new AgnosticAuthController(
    registerUseCase,
    loginUseCase,
    verifyEmailUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    logoutUseCase,
    tokenProvider,
    {
        accessTokenSecret: accessSecret,
        refreshTokenSecret: refreshSecret,
        isProduction: process.env.NODE_ENV === "production"
    }
);

const authMiddleware = authenticate(isTokenBlacklistedUseCase);

router.post("/register", authRateLimiter, ExpressAdapter.createHandler(req => controller.registerHandler(req)));
router.post("/login", authRateLimiter, ExpressAdapter.createHandler(req => controller.loginHandler(req)));
router.post("/logout", authMiddleware, ExpressAdapter.createHandler(req => controller.logoutHandler(req)));
router.get("/verify-email", ExpressAdapter.createHandler(req => controller.verifyEmailHandler(req)));
router.post("/forgot-password", authRateLimiter, ExpressAdapter.createHandler(req => controller.forgotPasswordHandler(req)));
router.post("/reset-password", authRateLimiter, ExpressAdapter.createHandler(req => controller.resetPasswordHandler(req)));

// Protected route example
router.get("/me", authMiddleware, csrfProtection, (req, res) => {
    res.json({ user: (req as any).user });
});

export default router;
