export interface EmailTemplate {
    subject: string;
    body: string;
}

export interface SmsTemplate {
    body: string;
}

export interface PushTemplate {
    title: string;
    body: string;
}

export type Template = EmailTemplate | SmsTemplate | PushTemplate;

export type TemplateVariables = Record<string, string | number>;

export interface TemplateRenderer {
    render(template: string, variables: TemplateVariables): string;
}

export interface RegisteredTemplates {
    [name: string]: Template;
}
