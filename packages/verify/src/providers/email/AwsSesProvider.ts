import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

export interface AwsSesConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    from: string;
}

/**
 * Agnostic AWS SES Provider using Fetch API (AWS Signature V4 not implemented here to keep zero-dep).
 * NOTE: This is a complex implementation for zero-dep. In a real scenario, use @aws-sdk/client-ses.
 * This provider serves as a template/placeholder for AWS SES integration.
 */
export class AwsSesProvider implements EmailProvider {
    constructor(private config: AwsSesConfig) { }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        console.warn("AwsSesProvider is a template. Please use @aws-sdk/client-ses for production.");
        throw new Error("AwsSesProvider requires AWS SDK or manual SigV4 signing. Extend EmailProvider to use your specific AWS configuration.");
    }
}
