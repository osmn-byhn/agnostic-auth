export class EmailNormalizer {
    static normalize(email: string): string {
        return email.trim().toLowerCase();
    }
}
