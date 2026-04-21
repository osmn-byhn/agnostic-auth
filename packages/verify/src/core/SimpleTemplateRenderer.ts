import { TemplateRenderer, TemplateVariables } from "../interfaces/TemplateInterfaces";

export class SimpleTemplateRenderer implements TemplateRenderer {
    render(template: string, variables: TemplateVariables): string {
        let rendered = template;

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`{{${key}}}`, "g");
            rendered = rendered.replace(placeholder, String(value));
        }

        return rendered;
    }
}
