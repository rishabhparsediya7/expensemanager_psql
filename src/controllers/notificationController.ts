import { Request, Response } from "express"
import { db } from "../db"
import { deviceTokens, notifications } from "../db/schema"
import { eq, and, desc, sql, count } from "drizzle-orm"

export const registerToken = async (req: Request, res: Response) => {
  const { userId, token, platform } = req.body

  if (!userId || !token || !platform) {
    return res
      .status(400)
      .json({ error: "userId, token, and platform are required" })
  }

  try {
    // Upsert: insert or update on conflict
    await db
      .insert(deviceTokens)
      .values({
        userId,
        token,
        platform,
      })
      .onConflictDoUpdate({
        target: [deviceTokens.userId, deviceTokens.token],
        set: { platform, createdAt: new Date().toISOString() },
      })

    console.log(`📱 FCM token registered for user ${userId} (${platform})`)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error registering FCM token:", error)
    res.status(500).json({ error: "Failed to register token" })
  }
}

export const unregisterToken = async (req: Request, res: Response) => {
  const { userId, token } = req.body

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" })
  }

  try {
    await db
      .delete(deviceTokens)
      .where(
        and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token))
      )

    console.log(`📱 FCM token unregistered for user ${userId}`)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error unregistering FCM token:", error)
    res.status(500).json({ error: "Failed to unregister token" })
  }
}

export const getNotifications = async (req: Request, res: Response) => {
  let { userId } = req.params
  const { limit = "20", offset = "0" } = req.query

  if (userId === "me" || !userId) {
    userId = req.userId as string
  }

  if (!userId) {
    return res.status(400).json({ error: "userId is required" })
  }

  try {
    const [result, unreadCountResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(Number(limit))
        .offset(Number(offset)),
      db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.isRead, false))
        ),
    ])

    res.json({
      notifications: result,
      unreadCount: Number(unreadCountResult[0].count),
    })
  } catch (error) {
    console.error("❌ Error fetching notifications:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error marking notification as read:", error)
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
}

export const markAllAsRead = async (req: Request, res: Response) => {
  let { userId } = req.params

  if (userId === "me" || !userId) {
    userId = req.userId as string
  }

  if (!userId) {
    return res.status(400).json({ error: "userId is required" })
  }

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error)
    res.status(500).json({ error: "Failed to mark all as read" })
  }
}
