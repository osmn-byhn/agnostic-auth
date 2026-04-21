import { AuthAdapter } from "../interfaces/AuthAdapter";
import { OtpManager, OtpOptions, PhoneNormalizer, EmailNormalizer } from "@agauth/verify";
import { InvalidCredentialsError } from "../errors/AuthErrors";

export class SendOtpUseCase {
    constructor(
        private adapter: AuthAdapter,
        private otpManager: OtpManager
    ) { }

    async execute(userId: string, type: "sms" | "email", options?: OtpOptions) {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        let identifier = type === "sms" ? user.phoneNumber : user.recoveryEmail || (user as any).email;
        if (!identifier) throw new Error(`${type} contact info missing for user`);

        identifier = type === "sms" ? PhoneNormalizer.normalize(identifier) : EmailNormalizer.normalize(identifier);

        return this.otpManager.sendOtp(identifier, type, options);
    }
}

export class VerifyOtpUseCase {
    constructor(
        private adapter: AuthAdapter,
        private otpManager: OtpManager
    ) { }

    async execute(userId: string, code: string, type: "sms" | "email", options?: OtpOptions) {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        let identifier = type === "sms" ? user.phoneNumber : user.recoveryEmail || (user as any).email;
        if (!identifier) throw new Error(`${type} identifier missing`);

        identifier = type === "sms" ? PhoneNormalizer.normalize(identifier) : EmailNormalizer.normalize(identifier);

        const isValid = await this.otpManager.verifyOtp(identifier, code, options);
        if (!isValid) throw new InvalidCredentialsError("Invalid or expired OTP");

        return true;
    }
}
