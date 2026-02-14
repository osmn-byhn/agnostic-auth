import { UserRepository } from "../interfaces/UserRepository";
import { verify } from "../crypto";

export class Login {
  constructor(private repo: UserRepository) {}

  async execute(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await verify(password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    return user;
  }
}
