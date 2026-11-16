// PostgreSQL connection. The schema is created automatically the first time it's needed.
import pg from "pg";

export const DATABASE_URL = process.env.DATABASE_URL || "postgres://verdikt:verdikt@127.0.0.1:5440/verdikt";
export class DbUnavailable extends Error {}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 });
pool.on("error", () => {}); // idle client errors are handled when the next query runs

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  language TEXT NOT NULL,
  verdict TEXT NOT NULL,
  passed INT NOT NULL,
  total INT NOT NULL,
  runtime_ms INT NOT NULL DEFAULT 0,
  memory_mb REAL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_user_problem_idx ON submissions(user_id, problem_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_created_idx ON submissions(created_at);
`;

const isDown = (e) => ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "57P03", "08006", "08001", "28P01", "3D000"].includes(e.code) || /timeout|ECONNREFUSED|Connection terminated/i.test(e.message);
const DOWN_MESSAGE = "The database isn't running. Start it with `npm run db:up`, then try again.";

let ready = null;
function connect() {
  ready ??= pool.query(SCHEMA).then(() => pool).catch((e) => {
    ready = null;
    throw isDown(e) ? new DbUnavailable(DOWN_MESSAGE) : e;
  });
  return ready;
}

export async function query(text, params) {
  const p = await connect();
  try { return await p.query(text, params); }
  catch (e) { if (isDown(e)) { ready = null; throw new DbUnavailable(DOWN_MESSAGE); } throw e; }
}

export async function dbReady() {
  try { await connect(); return true; } catch { return false; }
}
