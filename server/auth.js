// Accounts: password hashing (scrypt, built into Node) and cookie sessions stored in Postgres.
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "./db.js";

const scryptAsync = promisify(scrypt);
const COOKIE = "vk_session";
const SESSION_DAYS = 30;
const sha = (s) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
// Used when the account doesn't exist, so a login takes the same time either way.
export const DUMMY_HASH = `${"00".repeat(16)}:${"00".repeat(64)}`;

function cookieOf(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie ?? "");
  return m ? m[1] : null;
}
const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

export async function startSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 day')", [sha(token), userId, SESSION_DAYS]);
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

export async function endSession(req, res) {
  const token = cookieOf(req);
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha(token)]);
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export async function currentUser(req) {
  const token = cookieOf(req);
  if (!token) return null;
  const r = await query(
    "SELECT u.id, u.username, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [sha(token)]
  );
  return r.rows[0] ?? null;
}

export const purgeExpiredSessions = () => query("DELETE FROM sessions WHERE expires_at < now()").catch(() => {});
