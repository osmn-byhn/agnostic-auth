import { OtpGenerator } from "../interfaces/CommunicationInterfaces";
import { randomInt } from "crypto";

export class SecureOtpGenerator implements OtpGenerator {
    generate(length: number, options: { numeric?: boolean; alphanumeric?: boolean } = { numeric: true }): string {
        if (options.alphanumeric) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let result = "";
            for (let i = 0; i < length; i++) {
                result += chars.charAt(randomInt(0, chars.length));
            }
            return result;
        }

        // Default: numeric
        let result = "";
        for (let i = 0; i < length; i++) {
            result += randomInt(0, 10).toString();
        }
        return result;
    }
}
