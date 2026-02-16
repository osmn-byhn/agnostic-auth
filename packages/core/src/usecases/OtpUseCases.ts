import { AuthAdapter } from "../interfaces/AuthAdapter";
import { OtpRepository, SmsProvider, EmailProvider } from "../interfaces/CommunicationInterfaces";
import { InvalidCredentialsError } from "../errors/AuthErrors";

export class SendOtp {
    constructor(
        private adapter: AuthAdapter,
        private otpRepo: OtpRepository,
        private sms?: SmsProvider,
        private email?: EmailProvider
    ) { }

    async execute(userId: string, type: "sms" | "email") {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const identifier = type === "sms" ? user.phoneNumber : user.recoveryEmail || (user as any).email;
        if (!identifier) throw new Error(`${type} contact info missing for user`);

        await this.otpRepo.save(identifier, otp, expiresAt);

        if (type === "sms" && this.sms) {
            await this.sms.sendSms(identifier, `Your agauth code: ${otp}`);
        } else if (type === "email" && this.email) {
            await this.email.sendEmail(identifier, "Your Authentication Code", `Code: ${otp}`);
        }

        return otp; // Returning for testing/debug, usually hidden
    }
}

export class VerifyOtp {
    constructor(
        private adapter: AuthAdapter,
        private otpRepo: OtpRepository
    ) { }

    async execute(userId: string, code: string, type: "sms" | "email") {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        const identifier = type === "sms" ? user.phoneNumber : user.recoveryEmail || (user as any).email;
        if (!identifier) throw new Error(`${type} identifier missing`);

        const isValid = await this.otpRepo.verify(identifier, code);
        if (!isValid) throw new InvalidCredentialsError("Invalid or expired OTP");

        return true;
    }
}
