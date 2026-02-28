// socket.ts
import { Server, Socket } from "socket.io"
import { db } from "./db"
import { userKeys, messages, users } from "./db/schema"
import { eq } from "drizzle-orm"
import { sendPushNotification } from "./firebaseAdmin"

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

    socket.on("register", (userId: string) => {
      onlineUsers.set(userId, socket.id)
      console.log(`👤 User ${userId} is online with socket ${socket.id}`)
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
  })
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

export default { initSocket, getIO, onlineUsers }
