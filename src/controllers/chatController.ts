import pg from "pg"
import { Request, Response } from "express"
import config from "../database"
import { db } from "../db"
import { friends, users, messages } from "../db/schema"
import { and, eq, or, desc, sql } from "drizzle-orm"
import { getIO, onlineUsers } from "../socket"

export const uploadKeys = async (req: Request, res: Response) => {
  const { userId, publicKey, privateKey } = req.body
  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()
    await dbClient.query({
      text: `insert into "userKeys" ("publicKey", "encryptedPrivateKey", "userId") values ($1, $2, $3) on conflict ("userId") do update set "publicKey" = $1, "encryptedPrivateKey" = $2, "updatedAt" = now()`,
      values: [publicKey, privateKey, userId],
    })
    await dbClient.end()
    res.send({ success: true })
  } catch (err) {
    console.log("🚀 ~ uploadKeys ~ err:", err)
    res.status(500).json({ error: "Failed to store public key" })
  } finally {
    await dbClient?.end()
  }
}

export const getUserKeys = async (req: Request, res: Response) => {
  const { userId } = req.params
  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()
    const row = await dbClient.query({
      text: `select "publicKey", "encryptedPrivateKey", "userPassphrases"."cipherText", "userPassphrases"."iv" from "userKeys" left join "userPassphrases" on "userKeys"."userId" = "userPassphrases"."userId" where "userKeys"."userId" = $1`,
      values: [userId],
    })
    await dbClient.end()
    if (!row?.rows?.[0]) return res.status(404).json({ error: "Key not found" })
    res.status(200).send({
      publicKey: row?.rows?.[0]?.publicKey,
      encryptedPrivateKey: row?.rows?.[0]?.encryptedPrivateKey,
      cipherText: row?.rows?.[0]?.cipherText,
      iv: row?.rows?.[0]?.iv,
    })
  } catch (err) {
    console.log("🚀 ~ getUserKeys ~ err:", err)
    res.status(500).json({ error: "Error fetching public key" })
  } finally {
    await dbClient?.end()
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  const { senderId, receiverId, message, nonce } = req.body
  try {
    let dbClient
    dbClient = new pg.Client(config)
    await dbClient.connect()
    await dbClient.query({
      text: "insert into messages (sender_id, receiver_id, message, nonce) values ($1, $2, $3, $4)",
      values: [senderId, receiverId, message, nonce],
    })
    await dbClient.end()
    res.send({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to store message" })
  }
}

export const getHistory = async (req: Request, res: Response) => {
  const { userId, withUser } = req.query
  if (!userId || !withUser) {
    return res.status(400).json({ error: "User ID and With User are required" })
  }
  try {
    let dbClient
    dbClient = new pg.Client(config)
    await dbClient.connect()
    const msgs = await dbClient.query({
      text: "select * from messages where (sender_id = $1 and receiver_id = $2) or (sender_id = $2 and receiver_id = $1)",
      values: [userId, withUser],
    })
    await dbClient.end()
    res.send(msgs?.rows)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}

export const getFriends = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const dbClient = new pg.Client(config)
    await dbClient.connect()

    const friends = await dbClient.query({
      text: `
          SELECT
            u.id AS "friendId",
            u."firstName",
            u."lastName",
            u."profilePicture",
            m.message AS "lastMessage",
            m.nonce AS "nonce",
            m.sent_at AS "lastMessageTime"
          FROM friends f
          JOIN users u ON u.id = f.friend_id
          LEFT JOIN LATERAL (
            SELECT message, nonce, sent_at
            FROM messages
            WHERE 
              (sender_id = f.user_id AND receiver_id = f.friend_id)
              OR
              (sender_id = f.friend_id AND receiver_id = f.user_id)
            ORDER BY sent_at DESC
            LIMIT 1
          ) m ON TRUE
          WHERE f.user_id = $1 AND f.status = 'accepted'
          ORDER BY m.sent_at DESC NULLS LAST;
        `,
      values: [userId],
    })

    await dbClient.end()

    res.send(friends.rows)
  } catch (err) {
    console.error("❌ Error fetching friends:", err)
    res.status(500).json({ error: "Failed to fetch friends" })
  }
}

export const uploadPassphrase = async (req: Request, res: Response) => {
  const { userId, cipherText, iv } = req.body
  console.log(
    "🚀 ~ uploadPassphrase ~ userId, cypherText, iv:",
    userId,
    cipherText,
    iv
  )
  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()
    await dbClient.query({
      text: `insert into "userPassphrases" ("cipherText", "iv", "userId") values ($1, $2, $3) on conflict ("userId") do update set "cipherText" = $1, "iv" = $2, "updatedAt" = now()`,
      values: [cipherText, iv, userId],
    })
    await dbClient.end()
    res.status(200).json({ success: true })
  } catch (err) {
    console.log("🚀 ~ uploadPassphrase ~ err:", err)
    res.status(500).json({ error: "Failed to store passphrase" })
  } finally {
    await dbClient?.end()
  }
}

export const getPassphrase = async (req: Request, res: Response) => {
  const { userId } = req.params
  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()
    const row = await dbClient.query({
      text: `select "cypherText", "iv" from "userPassphrases" where "userId" = $1`,
      values: [userId],
    })
    if (!row?.rows?.[0])
      return res.status(404).json({ error: "Passphrase not found" })
    res
      .status(200)
      .json({ cypherText: row?.rows?.[0]?.cypherText, iv: row?.rows?.[0]?.iv })
  } catch (err) {
    console.log("🚀 ~ getPassphrase ~ err:", err)
    res.status(500).json({ error: "Error fetching passphrase" })
  } finally {
    await dbClient?.end()
  }
}

export const sendSplinkRequest = async (req: Request, res: Response) => {
  const userId = req.userId
  const { friendId } = req.body

  if (!userId || !friendId) {
    return res.status(400).json({ error: "User IDs are required" })
  }

  try {
    // Check if request already exists
    const existing = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
          and(eq(friends.userId, friendId), eq(friends.friendId, userId))
        )
      )

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Connection request already exists or you are already friends",
      })
    }

    await db.insert(friends).values({
      userId,
      friendId,
      status: "pending",
    })

    // 🔌 Socket notification: Notify receiver of new request
    const receiverSocketId = onlineUsers.get(friendId)
    if (receiverSocketId) {
      // Fetch sender info for a better notification
      const sender = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const senderName =
        sender.length > 0
          ? `${sender[0].firstName} ${sender[0].lastName}`
          : "Someone"

      getIO().to(receiverSocketId).emit("splink_request", {
        fromId: userId,
        fromName: senderName,
      })
    }

    res.status(200).json({ success: true, message: "Splink request sent" })
  } catch (err) {
    console.error("❌ Error sending Splink request:", err)
    res.status(500).json({ error: "Failed to send Splink request" })
  }
}

export const respondToSplinkRequest = async (req: Request, res: Response) => {
  const userId = req.userId
  const { friendId, action } = req.body // action: 'accept' or 'reject'

  if (!userId || !friendId || !action) {
    return res.status(400).json({ error: "Required fields missing" })
  }

  try {
    if (action === "accept") {
      // Start transaction or sequential updates
      await db.transaction(async (tx) => {
        // Update the received request to accepted
        await tx
          .update(friends)
          .set({ status: "accepted" })
          .where(
            and(eq(friends.userId, friendId), eq(friends.friendId, userId))
          )

        // Create the reverse connection for mutual friendship
        await tx
          .insert(friends)
          .values({
            userId: userId,
            friendId: friendId,
            status: "accepted",
          })
          .onConflictDoUpdate({
            target: [friends.userId, friends.friendId],
            set: { status: "accepted" },
          })
      })
    } else {
      await db
        .delete(friends)
        .where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)))
    }

    // 🔌 Socket notification: Notify sender/receiver of status change
    const targetId = friendId // Original sender
    const targetSocketId = onlineUsers.get(targetId)
    if (targetSocketId) {
      getIO().to(targetSocketId).emit("splink_response", {
        byUserId: userId,
        action,
      })
    }

    res.status(200).json({
      success: true,
      message:
        action === "accept"
          ? "Splink request accepted"
          : "Splink request rejected",
    })
  } catch (err) {
    console.error("❌ Error responding to Splink request:", err)
    res.status(500).json({ error: "Failed to respond to Splink request" })
  }
}

export const getPendingSplinks = async (req: Request, res: Response) => {
  const userId = req.userId

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const pending = await db
      .select({
        friendId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
        status: friends.status,
      })
      .from(friends)
      .innerJoin(users, eq(users.id, friends.userId))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "pending")))

    res.status(200).json(pending)
  } catch (err) {
    console.error("❌ Error fetching pending Splinks:", err)
    res.status(500).json({ error: "Failed to fetch pending Splinks" })
  }
}
