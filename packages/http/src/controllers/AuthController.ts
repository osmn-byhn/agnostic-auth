import { Register, Login } from "@authx/core";

export class AuthController {
  constructor(
    private register: Register,
    private login: Login,
  ) {}

  async registerHandler(req: any, res: any) {
    const { email, password } = req.body;
    const user = await this.register.execute(email, password);
    res.json(user);
  }

  async loginHandler(req: any, res: any) {
    const { email, password } = req.body;
    const user = await this.login.execute(email, password);
    res.json(user);
  }
}
