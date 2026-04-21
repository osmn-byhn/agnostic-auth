import * as admin from "firebase-admin";
import { PushProvider, PushMessage } from "../../interfaces/PushInterfaces";

export interface FcmConfig {
    credential?: admin.ServiceAccount;
    projectId?: string;
    appName?: string;
}

export class FcmProvider implements PushProvider {
    private app: admin.app.App;

    constructor(config: FcmConfig) {
        if (config.appName && admin.apps.find(app => app?.name === config.appName)) {
            this.app = admin.app(config.appName);
        } else {
            this.app = admin.initializeApp({
                credential: config.credential ? admin.credential.cert(config.credential) : undefined,
                projectId: config.projectId
            }, config.appName);
        }
    }

    async sendPush(message: PushMessage): Promise<void> {
        const payload: admin.messaging.MulticastMessage = {
            tokens: Array.isArray(message.target) ? message.target : [message.target],
            notification: {
                title: message.title,
                body: message.body,
            },
            data: message.data,
        };

        const response = await this.app.messaging().sendEachForMulticast(payload);

        if (response.failureCount > 0) {
            console.error(`FCM: ${response.failureCount} messages failed to send.`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`FCM Error [${idx}]:`, resp.error);
                }
            });
        }
    }
}
