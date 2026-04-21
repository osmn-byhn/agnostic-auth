import { PushProvider, PushMessage } from "../../interfaces/PushInterfaces";

export class ConsolePushProvider implements PushProvider {
    async sendPush(message: PushMessage): Promise<void> {
        console.log("--- CONSOLE PUSH NOTIFICATION ---");
        console.log(`To: ${Array.isArray(message.target) ? message.target.join(", ") : message.target}`);
        console.log(`Title: ${message.title}`);
        console.log(`Body: ${message.body}`);
        if (message.data) {
            console.log(`Data: ${JSON.stringify(message.data, null, 2)}`);
        }
        console.log("---------------------------------");
    }
}
