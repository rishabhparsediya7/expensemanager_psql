import admin from "firebase-admin"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"
import { db } from "./db"
import { deviceTokens, notifications } from "./db/schema"
import { eq, inArray } from "drizzle-orm"

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
  try {
    // Store notification in the database for in-app inbox
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      data: JSON.stringify(data),
    })

    // Get all FCM tokens for this user
    const result = await db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId))

    if (result.length === 0) {
      console.log(`📱 No device tokens found for user ${userId}`)
      return
    }

    const tokens = result.map((row) => row.token)

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
        await db
          .delete(deviceTokens)
          .where(inArray(deviceTokens.token, invalidTokens))

        console.log(`🧹 Cleaned up ${invalidTokens.length} invalid tokens`)
      }
    }
  } catch (error) {
    console.error("❌ Error sending push notification:", error)
  }
}

export default admin
