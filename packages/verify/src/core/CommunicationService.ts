import { SmsProvider, EmailProvider, MessageQueue, Message } from "../interfaces/CommunicationInterfaces";
import { PushProvider, PushMessage } from "../interfaces/PushInterfaces";
import { Template, EmailTemplate, SmsTemplate, PushTemplate, TemplateRenderer, TemplateVariables, RegisteredTemplates } from "../interfaces/TemplateInterfaces";
import { SimpleTemplateRenderer } from "./SimpleTemplateRenderer";

export class CommunicationService {
    private templates: RegisteredTemplates = {};
    private renderer: TemplateRenderer;

    constructor(
        private smsProvider?: SmsProvider,
        private emailProvider?: EmailProvider,
        private pushProvider?: PushProvider,
        private queue?: MessageQueue,
        renderer?: TemplateRenderer
    ) {
        this.renderer = renderer || new SimpleTemplateRenderer();
    }

    registerTemplate(name: string, template: Template): void {
        this.templates[name] = template;
    }

    async sendSms(to: string, message: string, useQueue: boolean = false): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({ type: "sms", payload: { to, body: message } });
            return;
        }

        if (!this.smsProvider) throw new Error("SMS Provider not configured");
        await this.smsProvider.sendSms(to, message);
    }

    async sendEmail(to: string, subject: string, body: string, useQueue: boolean = false): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({ type: "email", payload: { to, subject, body } });
            return;
        }

        if (!this.emailProvider) throw new Error("Email Provider not configured");
        await this.emailProvider.sendEmail(to, subject, body);
    }

    async sendPush(to: string | string[], title: string, body: string, data?: Record<string, string>, useQueue: boolean = false): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({ type: "push", payload: { to, title, body, data } });
            return;
        }

        if (!this.pushProvider) throw new Error("Push Provider not configured");
        await this.pushProvider.sendPush({ target: to, title, body, data });
    }

    async bulkSendEmail(emails: Array<{ to: string; subject: string; body: string }>, useQueue: boolean = true): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({
                type: "email",
                payload: {
                    to: emails.map(e => e.to),
                    subject: "Bulk Email",
                    body: JSON.stringify(emails)
                }
            });
            return;
        }

        if (!this.emailProvider) throw new Error("Email Provider not configured");
        if (this.emailProvider.sendBulkEmail) {
            await this.emailProvider.sendBulkEmail(emails);
        } else {
            for (const email of emails) {
                await this.emailProvider.sendEmail(email.to, email.subject, email.body);
            }
        }
    }

    async sendTemplatedMessage(
        to: string | string[],
        type: "sms" | "email" | "push",
        template: string | { subject?: string; title?: string; body: string },
        variables: TemplateVariables,
        useQueue: boolean = false
    ): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({
                type,
                payload: {
                    to,
                    templateName: typeof template === "string" ? template : undefined,
                    rawTemplate: typeof template !== "string" ? template : undefined,
                    variables
                }
            });
            return;
        }

        let subject = "";
        let title = "";
        let body = "";

        if (typeof template === "string") {
            const registered = this.templates[template];
            if (!registered) throw new Error(`Template '${template}' not registered`);

            if (type === "email") {
                const emailTpl = registered as EmailTemplate;
                subject = this.renderer.render(emailTpl.subject, variables);
                body = this.renderer.render(emailTpl.body, variables);
            } else if (type === "push") {
                const pushTpl = registered as PushTemplate;
                title = this.renderer.render(pushTpl.title, variables);
                body = this.renderer.render(pushTpl.body, variables);
            } else {
                const smsTpl = registered as SmsTemplate;
                body = this.renderer.render(smsTpl.body, variables);
            }
        } else {
            if (type === "email") {
                subject = this.renderer.render(template.subject || "", variables);
                body = this.renderer.render(template.body, variables);
            } else if (type === "push") {
                title = this.renderer.render(template.title || "", variables);
                body = this.renderer.render(template.body, variables);
            } else {
                body = this.renderer.render(template.body, variables);
            }
        }

        if (type === "email") {
            await this.sendEmail(to as string, subject, body, false);
        } else if (type === "push") {
            await this.sendPush(to, title, body, undefined, false);
        } else {
            await this.sendSms(to as string, body, false);
        }
    }

    async bulkSendTemplatedEmail(
        recipients: Array<{ to: string; variables: TemplateVariables }>,
        template: string | EmailTemplate,
        useQueue: boolean = true
    ): Promise<void> {
        if (useQueue && this.queue) {
            await this.queue.publish({
                type: "email",
                payload: {
                    to: recipients.map(r => r.to),
                    templateName: typeof template === "string" ? template : undefined,
                    rawTemplate: typeof template !== "string" ? template : undefined,
                    recipients
                }
            });
            return;
        }

        const emails = recipients.map(recipient => {
            let tpl: EmailTemplate;
            if (typeof template === "string") {
                const registered = this.templates[template];
                if (!registered || !("subject" in registered)) throw new Error(`Email template '${template}' not found`);
                tpl = registered;
            } else {
                tpl = template;
            }

            return {
                to: recipient.to,
                subject: this.renderer.render(tpl.subject, recipient.variables),
                body: this.renderer.render(tpl.body, recipient.variables)
            };
        });

        await this.bulkSendEmail(emails, false);
    }
}
