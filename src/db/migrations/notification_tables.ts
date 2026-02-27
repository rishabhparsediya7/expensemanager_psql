import pg from "pg"
import config from "../../database"

/**
 * Migration: Create deviceTokens and notifications tables
 */
async function migrate() {
  const client = new pg.Client(config)
  await client.connect()
  console.log("🔄 Running notification tables migration...")

  await client.query(`
    CREATE TABLE IF NOT EXISTS "deviceTokens" (
      id SERIAL PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("userId", token)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      "isRead" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
    CREATE INDEX IF NOT EXISTS idx_notifications_userId_unread ON notifications("userId") WHERE "isRead" = false;
    CREATE INDEX IF NOT EXISTS idx_deviceTokens_userId ON "deviceTokens"("userId");
  `)

  await client.end()
  console.log("✅ Notification tables migration complete!")
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})
