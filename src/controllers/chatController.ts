import { Request, Response } from "express"
import { db } from "../db"
import {
  friends,
  users,
  messages,
  userKeys,
  userPassphrases,
} from "../db/schema"
import { and, eq, or, desc, sql } from "drizzle-orm"
import { getIO, onlineUsers } from "../socket"
import { sendPushNotification } from "../firebaseAdmin"

export const uploadKeys = async (req: Request, res: Response) => {
  const { userId, publicKey, privateKey } = req.body
  try {
    await db
      .insert(userKeys)
      .values({
        userId,
        publicKey,
        encryptedPrivateKey: privateKey,
      })
      .onConflictDoUpdate({
        target: [userKeys.userId],
        set: {
          publicKey,
          encryptedPrivateKey: privateKey,
          updatedAt: new Date().toISOString(),
        },
      })
    res.send({ success: true })
  } catch (err) {
    console.log("🚀 ~ uploadKeys ~ err:", err)
    res.status(500).json({ error: "Failed to store public key" })
  }
}

export const getUserKeys = async (req: Request, res: Response) => {
  const { userId } = req.params
  try {
    const result = await db
      .select({
        publicKey: userKeys.publicKey,
        encryptedPrivateKey: userKeys.encryptedPrivateKey,
        cipherText: userPassphrases.cipherText,
        iv: userPassphrases.iv,
      })
      .from(userKeys)
      .leftJoin(userPassphrases, eq(userKeys.userId, userPassphrases.userId))
      .where(eq(userKeys.userId, userId))
      .limit(1)

    if (result.length === 0)
      return res.status(404).json({ error: "Key not found" })

    res.status(200).send({
      publicKey: result[0].publicKey,
      encryptedPrivateKey: result[0].encryptedPrivateKey,
      cipherText: result[0].cipherText,
      iv: result[0].iv,
    })
  } catch (err) {
    console.log("🚀 ~ getUserKeys ~ err:", err)
    res.status(500).json({ error: "Error fetching public key" })
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  const { senderId, receiverId, message, nonce } = req.body
  try {
    await db.insert(messages).values({
      senderId,
      receiverId,
      message,
      nonce,
    })
    res.send({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Failed to store message" })
  }
}

export const getHistory = async (req: Request, res: Response) => {
  const { userId, withUser, limit, before } = req.query
  if (!userId || !withUser) {
    return res.status(400).json({ error: "User ID and With User are required" })
  }

  const messageLimit = Math.min(Number(limit) || 50, 100)

  try {
    const whereClause = and(
      or(
        and(
          eq(messages.senderId, userId as string),
          eq(messages.receiverId, withUser as string)
        ),
        and(
          eq(messages.senderId, withUser as string),
          eq(messages.receiverId, userId as string)
        )
      ),
      before ? sql`${messages.sentAt} < ${before}` : undefined
    )

    const msgs = await db
      .select()
      .from(messages)
      .where(whereClause)
      .orderBy(desc(messages.sentAt))
      .limit(messageLimit + 1)

    // Check if there are more messages beyond the limit
    const hasMore = msgs.length > messageLimit
    const resultMessages = msgs.slice(0, messageLimit).reverse() // Reverse to get chronological order

    res.send({ messages: resultMessages, hasMore })
  } catch (err) {
    console.error("Error fetching history:", err)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}

export const getFriends = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Using a lateral join equivalent in Drizzle can be tricky,
    // so we'll use a subquery or a raw SQL for the complex part if needed.
    // However, we can also use Drizzle's execute for the original complex query to be safe and efficient.
    const result = await db.execute(sql`
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
          WHERE f.user_id = ${userId} AND f.status = 'accepted'
          ORDER BY m.sent_at DESC NULLS LAST;
    `)

    res.send(result.rows)
  } catch (err) {
    console.error("❌ Error fetching friends:", err)
    res.status(500).json({ error: "Failed to fetch friends" })
  }
}

export const uploadPassphrase = async (req: Request, res: Response) => {
  const { userId, cipherText, iv } = req.body
  try {
    await db
      .insert(userPassphrases)
      .values({
        userId,
        cipherText,
        iv,
      })
      .onConflictDoUpdate({
        target: [userPassphrases.userId],
        set: { cipherText, iv, updatedAt: new Date().toISOString() },
      })
    res.status(200).json({ success: true })
  } catch (err) {
    console.log("🚀 ~ uploadPassphrase ~ err:", err)
    res.status(500).json({ error: "Failed to store passphrase" })
  }
}

export const getPassphrase = async (req: Request, res: Response) => {
  const { userId } = req.params
  try {
    const result = await db
      .select({
        cipherText: userPassphrases.cipherText,
        iv: userPassphrases.iv,
      })
      .from(userPassphrases)
      .where(eq(userPassphrases.userId, userId))
      .limit(1)

    if (result.length === 0)
      return res.status(404).json({ error: "Passphrase not found" })

    res.status(200).json({ cypherText: result[0].cipherText, iv: result[0].iv })
  } catch (err) {
    console.log("🚀 ~ getPassphrase ~ err:", err)
    res.status(500).json({ error: "Error fetching passphrase" })
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

    // 🔔 Push notification: Always notify receiver of new Splink request
    const sender = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const senderName =
      sender.length > 0
        ? `${sender[0].firstName} ${sender[0].lastName}`
        : "Someone"

    // Socket notification if online
    const receiverSocketId = onlineUsers.get(friendId)
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("splink_request", {
        fromId: userId,
        fromName: senderName,
      })
    }

    // Push notification (always, even if online)
    sendPushNotification(
      friendId,
      "New Friend Request",
      `${senderName} sent you a Splink request`,
      { senderId: userId, type: "splink_request" },
      "splink_request"
    )

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

    // 🔔 Push notification: Notify original sender of response
    const responder = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const responderName =
      responder.length > 0
        ? `${responder[0].firstName} ${responder[0].lastName}`
        : "Someone"

    sendPushNotification(
      friendId,
      action === "accept"
        ? "Friend Request Accepted"
        : "Friend Request Declined",
      action === "accept"
        ? `${responderName} accepted your Splink request`
        : `${responderName} declined your Splink request`,
      { senderId: userId, type: "splink_response", action },
      "splink_response"
    )

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
