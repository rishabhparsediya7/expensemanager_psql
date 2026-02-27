import admin from "firebase-admin"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"
import pg from "pg"
import config from "./database"

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load service account key (ESM-compatible)
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf-8")
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

/**
 * Send a push notification to a specific user across all their devices.
 * Also stores the notification in the database for in-app inbox.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
  type: string = "general"
) {
  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    // Store notification in the database for in-app inbox
    await dbClient.query(
      `INSERT INTO notifications ("userId", type, title, body, data) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, JSON.stringify(data)]
    )

    // Get all FCM tokens for this user
    const result = await dbClient.query(
      `SELECT token FROM "deviceTokens" WHERE "userId" = $1`,
      [userId]
    )

    await dbClient.end()

    if (result.rows.length === 0) {
      console.log(`📱 No device tokens found for user ${userId}`)
      return
    }

    const tokens = result.rows.map((row: any) => row.token)

    // Send to all devices
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        type,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(
      `🔔 Notifications sent to ${userId}: ${response.successCount} success, ${response.failureCount} failure`
    )

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = []
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          resp.error?.code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(tokens[idx])
        }
      })
      if (invalidTokens.length > 0) {
        const cleanupClient = new pg.Client(config)
        await cleanupClient.connect()
        for (const token of invalidTokens) {
          await cleanupClient.query(
            `DELETE FROM "deviceTokens" WHERE token = $1`,
            [token]
          )
        }
        await cleanupClient.end()
        console.log(`🧹 Cleaned up ${invalidTokens.length} invalid tokens`)
      }
    }
  } catch (error) {
    console.error("❌ Error sending push notification:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
  }
}

export default admin
