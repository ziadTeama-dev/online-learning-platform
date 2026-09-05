import bcrypt from "bcrypt";

const saltRound = Number.parseInt(process.env.SALTROUND || "12", 10);
if (!Number.isInteger(saltRound) || saltRound < 10 || saltRound > 15) {
    throw new Error("SALTROUND must be an integer between 10 and 15");
}

export const hashPassword = (password) => bcrypt.hash(password, saltRound);
export const comparePassword = (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);
