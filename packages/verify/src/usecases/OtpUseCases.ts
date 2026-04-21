import { OtpManager, OtpOptions } from "../core/OtpManager";

export class SendOtp {
    constructor(
        private otpManager: OtpManager
    ) { }

    async execute(identifier: string, type: "sms" | "email", options?: OtpOptions) {
        return this.otpManager.sendOtp(identifier, type, options);
    }
}

export class VerifyOtp {
    constructor(
        private otpManager: OtpManager
    ) { }

    async execute(identifier: string, code: string, options?: OtpOptions) {
        return this.otpManager.verifyOtp(identifier, code, options);
    }
}
