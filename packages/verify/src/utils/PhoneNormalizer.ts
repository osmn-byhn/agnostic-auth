export class PhoneNormalizer {
    static normalize(phone: string): string {
        // Remove all non-numeric characters except +
        let normalized = phone.replace(/[^\d+]/g, "");

        // Basic E.164-ish normalization (just ensuring it starts with + if it looks like an international number)
        // This can be expanded with library like libphonenumber-js in real-world scenarios
        if (normalized.startsWith("00")) {
            normalized = "+" + normalized.substring(2);
        }

        return normalized;
    }
}
