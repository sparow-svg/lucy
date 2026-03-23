import { pool } from "@workspace/db";

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid varchar NOT NULL COLLATE "default",
      sess json NOT NULL,
      expire timestamp(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    ) WITH (OIDS=FALSE);

    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

    CREATE TABLE IF NOT EXISTS connected_services (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_name text NOT NULL,
      connected_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}
