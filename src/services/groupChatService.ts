import { db } from "../db"
import { groupMessages, users } from "../db/schema"
import { eq, desc } from "drizzle-orm"

interface SendGroupMessageParams {
  groupId: string
  senderId: string
  message: string
  messageType?: string // text, expense_added, settlement, member_joined, member_left
  metadata?: Record<string, any>
}

class GroupChatService {
  /**
   * Send a group message. Text messages require premium.
   */
  async sendGroupMessage(params: SendGroupMessageParams) {
    try {
      const {
        groupId,
        senderId,
        message,
        messageType = "text",
        metadata,
      } = params

      // Premium check for text messages
      if (messageType === "text") {
        const [user] = await db
          .select({ isPremium: users.isPremium })
          .from(users)
          .where(eq(users.id, senderId))
          .limit(1)

        if (!user?.isPremium) {
          return {
            success: false,
            statusCode: 403,
            message:
              "Group chat is a premium feature. Upgrade to send messages.",
          }
        }
      }

      const [newMessage] = await db
        .insert(groupMessages)
        .values({
          groupId,
          senderId,
          message,
          messageType,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning()

      // Fetch sender info for the response
      const [sender] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
        })
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1)

      return {
        success: true,
        data: {
          ...newMessage,
          senderName: sender
            ? `${sender.firstName} ${sender.lastName}`
            : "Unknown",
          senderProfilePicture: sender?.profilePicture || null,
        },
      }
    } catch (error) {
      console.error("GroupChatService.sendGroupMessage error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send message",
      }
    }
  }

  /**
   * Get paginated group messages (all users can read)
   */
  async getGroupMessages(
    groupId: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const offset = (page - 1) * limit

      const messages = await db
        .select({
          id: groupMessages.id,
          groupId: groupMessages.groupId,
          senderId: groupMessages.senderId,
          message: groupMessages.message,
          messageType: groupMessages.messageType,
          metadata: groupMessages.metadata,
          sentAt: groupMessages.sentAt,
          senderFirstName: users.firstName,
          senderLastName: users.lastName,
          senderProfilePicture: users.profilePicture,
        })
        .from(groupMessages)
        .leftJoin(users, eq(groupMessages.senderId, users.id))
        .where(eq(groupMessages.groupId, groupId))
        .orderBy(desc(groupMessages.sentAt))
        .limit(limit)
        .offset(offset)

      const formattedMessages = messages.map((msg) => ({
        id: msg.id,
        groupId: msg.groupId,
        senderId: msg.senderId,
        message: msg.message,
        messageType: msg.messageType,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        sentAt: msg.sentAt,
        senderName: msg.senderFirstName
          ? `${msg.senderFirstName} ${msg.senderLastName}`
          : "Unknown",
        senderProfilePicture: msg.senderProfilePicture || null,
      }))

      return { success: true, data: formattedMessages }
    } catch (error) {
      console.error("GroupChatService.getGroupMessages error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get messages",
      }
    }
  }

  /**
   * Add a system message (always allowed, no premium check).
   * Used for expense/settlement/member change events.
   */
  async addSystemMessage(
    groupId: string,
    senderId: string,
    messageType: string,
    description: string,
    metadata?: Record<string, any>
  ) {
    try {
      const [newMessage] = await db
        .insert(groupMessages)
        .values({
          groupId,
          senderId,
          message: description,
          messageType,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning()

      // Fetch sender info for socket broadcasting
      const [sender] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
        })
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1)

      return {
        success: true,
        data: {
          ...newMessage,
          senderName: sender
            ? `${sender.firstName} ${sender.lastName}`
            : "Unknown",
          senderProfilePicture: sender?.profilePicture || null,
        },
      }
    } catch (error) {
      console.error("GroupChatService.addSystemMessage error:", error)
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to add system message",
      }
    }
  }
}

export default new GroupChatService()
