import bcrypt from "bcryptjs";

export const hash = (password: string) => bcrypt.hash(password, 10);

export const verify = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
