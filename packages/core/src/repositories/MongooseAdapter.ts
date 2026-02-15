import { AuthAdapter } from "../interfaces/AuthAdapter";
import { User } from "../entities/User";

export class MongooseAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private userModel: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.userModel.findOne(where).lean();
    }

    async create(data: Omit<TUser, "id">): Promise<TUser> {
        const user = await this.userModel.create(data);
        return user.toObject();
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        return this.userModel.findByIdAndUpdate(id, data, { new: true }).lean();
    }

    metadata = {
        name: "Mongoose Adapter",
        type: "mongodb" as const
    };
}
