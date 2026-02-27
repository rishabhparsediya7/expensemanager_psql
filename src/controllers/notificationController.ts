import { Request, Response } from "express"
import pg from "pg"
import config from "../database"

export const registerToken = async (req: Request, res: Response) => {
  const { userId, token, platform } = req.body

  if (!userId || !token || !platform) {
    return res
      .status(400)
      .json({ error: "userId, token, and platform are required" })
  }

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    // Upsert: insert or update on conflict
    await dbClient.query(
      `INSERT INTO "deviceTokens" ("userId", token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT ("userId", token) DO UPDATE SET platform = $3, "createdAt" = NOW()`,
      [userId, token, platform]
    )

    await dbClient.end()
    console.log(`📱 FCM token registered for user ${userId} (${platform})`)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error registering FCM token:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
    res.status(500).json({ error: "Failed to register token" })
  }
}

export const unregisterToken = async (req: Request, res: Response) => {
  const { userId, token } = req.body

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" })
  }

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    await dbClient.query(
      `DELETE FROM "deviceTokens" WHERE "userId" = $1 AND token = $2`,
      [userId, token]
    )

    await dbClient.end()
    console.log(`📱 FCM token unregistered for user ${userId}`)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error unregistering FCM token:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
    res.status(500).json({ error: "Failed to unregister token" })
  }
}

export const getNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params
  const { limit = "20", offset = "0" } = req.query

  if (!userId) {
    return res.status(400).json({ error: "userId is required" })
  }

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    const result = await dbClient.query(
      `SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      [userId, Number(limit), Number(offset)]
    )

    const unreadCount = await dbClient.query(
      `SELECT COUNT(*) as count FROM notifications WHERE "userId" = $1 AND "isRead" = false`,
      [userId]
    )

    await dbClient.end()
    res.json({
      notifications: result.rows,
      unreadCount: Number(unreadCount.rows[0].count),
    })
  } catch (error) {
    console.error("❌ Error fetching notifications:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    await dbClient.query(
      `UPDATE notifications SET "isRead" = true WHERE id = $1`,
      [notificationId]
    )

    await dbClient.end()
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error marking notification as read:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
}

export const markAllAsRead = async (req: Request, res: Response) => {
  const { userId } = req.params

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()

    await dbClient.query(
      `UPDATE notifications SET "isRead" = true WHERE "userId" = $1 AND "isRead" = false`,
      [userId]
    )

    await dbClient.end()
    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error)
    if (dbClient) {
      try {
        await dbClient.end()
      } catch {}
    }
    res.status(500).json({ error: "Failed to mark all as read" })
  }
}
