import { MessageQueue, Message } from "../interfaces/CommunicationInterfaces";
import amqp from "amqplib";

export class RabbitMqAdapter implements MessageQueue {
    private connection?: any;
    private channel?: any;
    private readonly queueName = "agauth_communication";

    constructor(private url: string) { }

    async connect(): Promise<void> {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.queueName, { durable: true });
    }

    async publish(message: Message): Promise<void> {
        if (!this.channel) throw new Error("RabbitMQ channel not initialized");
        this.channel.sendToQueue(this.queueName, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });
    }

    async consume(handler: (message: Message) => Promise<void>): Promise<void> {
        if (!this.channel) throw new Error("RabbitMQ channel not initialized");
        await this.channel.consume(this.queueName, async (msg) => {
            if (msg) {
                try {
                    const content: Message = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel?.ack(msg);
                } catch (error) {
                    console.error("Worker processing error:", error);
                    // Optionally nack with requeue: false to avoid infinite loops on bad messages
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }

    async disconnect(): Promise<void> {
        await this.channel?.close();
        await this.connection?.close();
    }
}
