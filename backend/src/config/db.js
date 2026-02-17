import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set in environment variables");
}

export const sql = neon(process.env.DATABASE_URL);

export const query = async (text, params) => {
  const result = await sql(text, params || []);
  return { rows: result };
};
