import { UserRepository } from "../interfaces/UserRepository";
import { hash } from "../crypto";

export class Register {
  constructor(private repo: UserRepository) {}

  async execute(email: string, password: string) {
    const exists = await this.repo.findByEmail(email);
    if (exists) throw new Error("User already exists");

    const passwordHash = await hash(password);

    return this.repo.create({
      email,
      passwordHash,
      createdAt: new Date(),
    });
  }
}
