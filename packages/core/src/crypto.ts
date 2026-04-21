import bcrypt from "bcryptjs";
import crypto from "crypto";

export const hash = (password: string) => bcrypt.hash(password, 10);

export const verify = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const sha256 = (data: string) =>
  crypto.createHash("sha256").update(data).digest("hex");

export const generateToken = () => crypto.randomBytes(32).toString("hex");
