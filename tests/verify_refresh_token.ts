import { MemoryAdapter } from "../packages/core/src/repositories/MemoryAdapter";
import { GenerateAuthTokens } from "../packages/core/src/usecases/AuthTokens";
import { RotateRefreshToken } from "../packages/core/src/usecases/RotationUseCases";
import { SessionManager } from "../packages/core/src/usecases/SecurityUseCases";
import { JwtProvider } from "../packages/core/src/strategies/JwtProvider";
import { sha256 } from "../packages/core/src/crypto";

async function runTest() {
    console.log("Starting Refresh Token Verification...");

    const adapter = new MemoryAdapter();
    const tokenProvider = new JwtProvider("secret");
    const sessionManager = new SessionManager(adapter);
    
    const generateAuthTokens = new GenerateAuthTokens(tokenProvider, sessionManager);
    const rotateRefreshToken = new RotateRefreshToken(adapter, tokenProvider);

    const userId = "user_123";
    const metadata = { ip: "127.0.0.1", userAgent: "TestAgent", fingerprint: "fp123" };

    // 1. Generate initial tokens
    console.log("Step 1: Generating initial tokens...");
    const tokens = await generateAuthTokens.execute(userId, metadata);
    console.log("Initial Refresh Token (first 10 chars):", tokens.refreshToken.substring(0, 10));

    // 2. Verify it's hashed in the adapter
    const session = await adapter.findSession({ userId });
    if (!session) throw new Error("Session not found in adapter");
    
    const expectedHash = sha256(tokens.refreshToken);
    if (session.refreshTokenHash !== expectedHash) {
        throw new Error(`Hash mismatch! Expected ${expectedHash}, got ${session.refreshTokenHash}`);
    }
    console.log("✔ Refresh Token is correctly hashed in storage.");

    // 3. Rotate tokens
    console.log("Step 2: Rotating tokens...");
    const rotatedTokens = await rotateRefreshToken.execute(tokens.refreshToken, metadata.ip, metadata.userAgent, metadata.fingerprint);
    console.log("Rotated Refresh Token (first 10 chars):", rotatedTokens.refreshToken.substring(0, 10));

    if (tokens.refreshToken === rotatedTokens.refreshToken) {
        throw new Error("Tokens should be different after rotation!");
    }
    console.log("✔ Rotation generated new tokens.");

    // 4. Verify old token is now invalid (Replay attack detection)
    try {
        console.log("Step 3: Attempting replay attack with old token...");
        await rotateRefreshToken.execute(tokens.refreshToken, metadata.ip, metadata.userAgent, metadata.fingerprint);
        throw new Error("Replay attack should have been detected!");
    } catch (error: any) {
        if (error.message.includes("Security breach detected")) {
            console.log("✔ Replay attack correctly detected and blocked.");
        } else {
            throw error;
        }
    }

    // 5. Verify all user sessions were revoked after replay attack
    const finalSessions = await adapter.findUserSessions(userId);
    if (finalSessions.length !== 0) {
        throw new Error(`Sessions should be empty after replay attack detection, but found ${finalSessions.length}`);
    }
    console.log("✔ All user sessions revoked after replay attack.");

    console.log("\nALL VERIFICATIONS PASSED! 🚀");
}

runTest().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
