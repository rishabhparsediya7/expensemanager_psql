// socket.ts
import { Server, Socket } from "socket.io"
import { db } from "./db"
import { userKeys, messages, users, groupMembers } from "./db/schema"
import { eq } from "drizzle-orm"
import { sendPushNotification } from "./firebaseAdmin"
import GroupChatService from "./services/groupChatService"

let io: Server
export const onlineUsers = new Map<string, string>()

interface MessagePayload {
  senderId: string
  receiverId: string
  message: string
  nonce: string
}

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  })

  io.on("connection", (socket: Socket) => {
    console.log("✅ Socket connected:", socket.id)

    socket.on("register", async (userId: string) => {
      onlineUsers.set(userId, socket.id)
      console.log(`👤 User ${userId} is online with socket ${socket.id}`)

      // Auto-join all group rooms the user belongs to
      try {
        const userGroups = await db
          .select({ groupId: groupMembers.groupId })
          .from(groupMembers)
          .where(eq(groupMembers.userId, userId))

        for (const { groupId } of userGroups) {
          socket.join(`group:${groupId}`)
        }
        if (userGroups.length > 0) {
          console.log(
            `🏠 User ${userId} joined ${userGroups.length} group rooms`
          )
        }
      } catch (err) {
        console.error("Failed to auto-join group rooms:", err)
      }
    })

    socket.on(
      "send-message",
      async ({ senderId, receiverId, message, nonce }: MessagePayload) => {
        console.log(`📨 Encrypted message from ${senderId} to ${receiverId}`)

        try {
          const keyResult = await db
            .select({ publicKey: userKeys.publicKey })
            .from(userKeys)
            .where(eq(userKeys.userId, senderId))
            .limit(1)

          if (keyResult.length === 0) {
            console.warn(`⚠️ No public key found for sender ${senderId}`)
            return
          }

          const senderPublicKey = keyResult[0].publicKey

          await db.insert(messages).values({
            senderId,
            receiverId,
            message,
            nonce,
          })

          const receiverSocketId = onlineUsers.get(receiverId)
          console.log("🚀 ~ initSocket ~ receiverSocketId:", receiverSocketId)
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive-message", {
              senderId,
              message,
              nonce,
              senderPublicKey,
            })
            console.log(`📤 Message sent to ${receiverId}`)
          } else {
            console.log(
              `📴 Receiver ${receiverId} is offline, sending push notification`
            )
            // Get sender name for the notification
            const senderResult = await db
              .select({
                firstName: users.firstName,
                lastName: users.lastName,
              })
              .from(users)
              .where(eq(users.id, senderId))
              .limit(1)

            const senderName =
              senderResult.length > 0
                ? `${senderResult[0].firstName} ${senderResult[0].lastName}`
                : "Someone"

            sendPushNotification(
              receiverId,
              `${senderName}`,
              "Sent you a message",
              { senderId, type: "chat_message" },
              "chat_message"
            )
          }
        } catch (err) {
          console.error("❌ send-message failed:", (err as Error).message)
        }
      }
    )

    socket.on("disconnect", () => {
      for (const [userId, sId] of onlineUsers.entries()) {
        if (sId === socket.id) {
          onlineUsers.delete(userId)
          console.log(`👋 User ${userId} disconnected`)
          break
        }
      }
    })

    // ======================================
    // Group Room Management
    // ======================================

    socket.on("join-group", (groupId: string) => {
      socket.join(`group:${groupId}`)
      console.log(`🏠 Socket ${socket.id} joined group:${groupId}`)
    })

    socket.on("leave-group", (groupId: string) => {
      socket.leave(`group:${groupId}`)
      console.log(`🚪 Socket ${socket.id} left group:${groupId}`)
    })

    // ======================================
    // Group Chat (Premium-gated for text messages)
    // ======================================

    socket.on(
      "send-group-message",
      async ({
        groupId,
        senderId,
        message,
      }: {
        groupId: string
        senderId: string
        message: string
      }) => {
        try {
          const result = await GroupChatService.sendGroupMessage({
            groupId,
            senderId,
            message,
            messageType: "text",
          })

          if (result.success) {
            // Broadcast to all members in the group room
            io.to(`group:${groupId}`).emit("receive-group-message", {
              ...result.data,
              groupId,
            })
          } else {
            // Notify sender of failure (e.g., premium required)
            socket.emit("group-message-error", {
              groupId,
              message: result.message,
              statusCode: (result as any).statusCode || 400,
            })
          }
        } catch (err) {
          console.error("send-group-message failed:", err)
          socket.emit("group-message-error", {
            groupId,
            message: "Failed to send message",
          })
        }
      }
    )

    // ======================================
    // 1:1 Expense System Messages
    // ======================================

    socket.on(
      "send-expense-message",
      async ({
        senderId,
        receiverId,
        message,
        metadata,
      }: {
        senderId: string
        receiverId: string
        message: string
        metadata: { splitExpenseId: string; amount: number; action: string }
      }) => {
        try {
          // Save to messages DB
          await db.insert(messages).values({
            senderId,
            receiverId,
            message,
            nonce: `expense_${metadata.splitExpenseId}_${Date.now()}`,
          })

          // Send via socket if receiver is online
          const receiverSocketId = onlineUsers.get(receiverId)
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive-message", {
              senderId,
              message,
              nonce: `expense_${metadata.splitExpenseId}_${Date.now()}`,
              type: "expense_notification",
              metadata,
            })
          }
        } catch (err) {
          console.error("send-expense-message failed:", err)
        }
      }
    )
  })
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

export default { initSocket, getIO, onlineUsers }
