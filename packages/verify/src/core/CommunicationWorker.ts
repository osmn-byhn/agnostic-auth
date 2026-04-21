import { SmsProvider, EmailProvider, MessageQueue, Message } from "../interfaces/CommunicationInterfaces";
import { PushProvider } from "../interfaces/PushInterfaces";
import { TemplateRenderer, RegisteredTemplates } from "../interfaces/TemplateInterfaces";
import { SimpleTemplateRenderer } from "./SimpleTemplateRenderer";

export class CommunicationWorker {
    private renderer: TemplateRenderer;
    private templates: RegisteredTemplates = {};

    constructor(
        private queue: MessageQueue,
        private smsProvider?: SmsProvider,
        private emailProvider?: EmailProvider,
        private pushProvider?: PushProvider,
        renderer?: TemplateRenderer
    ) {
        this.renderer = renderer || new SimpleTemplateRenderer();
    }

    registerTemplate(name: string, template: any): void {
        this.templates[name] = template;
    }

    async start(): Promise<void> {
        await this.queue.connect();
        await this.queue.consume(async (message) => {
            await this.processMessage(message);
        });
    }

    private async processMessage(message: Message): Promise<void> {
        const { type, payload } = message;

        if (type === "sms") {
            if (!this.smsProvider) throw new Error("SMS Provider not configured in worker");

            let body = payload.body || "";
            if (payload.templateName) {
                const template = this.templates[payload.templateName];
                if (template) body = this.renderer.render(template.body, payload.variables || {});
            } else if (payload.rawTemplate) {
                body = this.renderer.render(payload.rawTemplate.body, payload.variables || {});
            }

            await this.smsProvider.sendSms(payload.to as string, body);
        } else if (type === "push") {
            if (!this.pushProvider) throw new Error("Push Provider not configured in worker");

            let title = payload.title || "";
            let body = payload.body || "";

            if (payload.templateName) {
                const template = this.templates[payload.templateName];
                if (!template) throw new Error(`Template '${payload.templateName}' not found in worker`);

                if ("title" in template) title = this.renderer.render((template as any).title, payload.variables || {});
                body = this.renderer.render(template.body, payload.variables || {});
            } else if (payload.rawTemplate) {
                if (payload.rawTemplate.subject) title = this.renderer.render(payload.rawTemplate.subject, payload.variables || {}); // Fallback subject to title for push
                if ((payload.rawTemplate as any).title) title = this.renderer.render((payload.rawTemplate as any).title, payload.variables || {});
                body = this.renderer.render(payload.rawTemplate.body, payload.variables || {});
            }

            await this.pushProvider.sendPush({
                target: payload.to,
                title,
                body,
                data: payload.data
            });
        } else if (type === "email") {
            if (!this.emailProvider) throw new Error("Email Provider not configured in worker");

            let subject = payload.subject || "";
            let body = payload.body || "";

            if (payload.templateName) {
                const template = this.templates[payload.templateName];
                if (!template) throw new Error(`Template '${payload.templateName}' not found in worker`);

                if ("subject" in template) {
                    subject = this.renderer.render((template as any).subject, payload.variables || {});
                }
                body = this.renderer.render(template.body, payload.variables || {});
            } else if (payload.rawTemplate) {
                if (payload.rawTemplate.subject) {
                    subject = this.renderer.render(payload.rawTemplate.subject, payload.variables || {});
                }
                body = this.renderer.render(payload.rawTemplate.body, payload.variables || {});
            }

            if (payload.recipients) {
                // Bulk Templated Personalization
                const emails = payload.recipients.map(recipient => {
                    let rSubject = subject;
                    let rBody = body;

                    // If it's a personalized template, re-render for EACH recipient
                    if (payload.templateName) {
                        const template = this.templates[payload.templateName] as any;
                        if (template.subject) rSubject = this.renderer.render(template.subject, recipient.variables);
                        rBody = this.renderer.render(template.body, recipient.variables);
                    } else if (payload.rawTemplate) {
                        if (payload.rawTemplate.subject) rSubject = this.renderer.render(payload.rawTemplate.subject, recipient.variables);
                        rBody = this.renderer.render(payload.rawTemplate.body, recipient.variables);
                    }

                    return { to: recipient.to, subject: rSubject, body: rBody };
                });

                if (this.emailProvider.sendBulkEmail) {
                    await this.emailProvider.sendBulkEmail(emails);
                } else {
                    for (const email of emails) {
                        await this.emailProvider.sendEmail(email.to, email.subject, email.body);
                    }
                }
            } else if (Array.isArray(payload.to)) {
                // Legacy/Non-templated Bulk Email
                if (this.emailProvider.sendBulkEmail) {
                    const emails = JSON.parse(body || "[]");
                    await this.emailProvider.sendBulkEmail(emails);
                } else {
                    const emails = JSON.parse(body || "[]");
                    for (const email of emails) {
                        await this.emailProvider.sendEmail(email.to, email.subject, email.body);
                    }
                }
            } else {
                // Single Email
                await this.emailProvider.sendEmail(payload.to as string, subject, body);
            }
        }
    }

    async stop(): Promise<void> {
        await this.queue.disconnect();
    }
}
