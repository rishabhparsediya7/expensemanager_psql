import { db } from "../db"
import {
  groups,
  groupMembers,
  users,
  groupBalances,
  splitExpenses,
  activityLogs,
} from "../db/schema"
import { eq, and, inArray, sql, desc } from "drizzle-orm"

class GroupService {
  /**
   * Get list of groups for a user
   */
  async getGroupList(userId: string) {
    try {
      // Get all group IDs where user is a member
      const memberGroups = await db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId))

      if (memberGroups.length === 0) {
        return { success: true, data: [] }
      }

      const groupIds = memberGroups.map((m) => m.groupId)

      // Get group details with member count
      const groupsList = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          image: groups.image,
          type: groups.type,
          createdByUser: groups.createdByUser,
          createdAt: groups.createdAt,
          updatedAt: groups.updatedAt,
          memberCount: sql<number>`(
            SELECT COUNT(*)::int FROM "groupMembers" 
            WHERE "groupId" = ${groups.id}
          )`,
        })
        .from(groups)
        .where(inArray(groups.id, groupIds))

      // Get balance summary per group for this user
      const enrichedGroups = await Promise.all(
        groupsList.map(async (group) => {
          const balances = await db
            .select({
              balance: groupBalances.balance,
              friendId: groupBalances.friendId,
            })
            .from(groupBalances)
            .where(
              and(
                eq(groupBalances.groupId, group.id),
                eq(groupBalances.userId, userId)
              )
            )

          const totalOwed = balances.reduce((sum, b) => {
            const bal = parseFloat(b.balance)
            return bal > 0 ? sum + bal : sum
          }, 0)

          const totalOwing = balances.reduce((sum, b) => {
            const bal = parseFloat(b.balance)
            return bal < 0 ? sum + Math.abs(bal) : sum
          }, 0)

          return {
            ...group,
            balanceSummary: {
              youAreOwed: totalOwed,
              youOwe: totalOwing,
              net: totalOwed - totalOwing,
            },
          }
        })
      )

      return {
        success: true,
        data: enrichedGroups,
      }
    } catch (error) {
      console.error("GroupService.getGroupList error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get group list",
      }
    }
  }

  /**
   * Get details of a specific group
   */
  async getGroupDetails(groupId: string, currentUserId?: string) {
    try {
      const [groupDetail] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))

      if (!groupDetail) {
        return { success: false, message: "Group not found" }
      }

      // Get members with profile info
      const members = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profilePicture: users.profilePicture,
        })
        .from(groupMembers)
        .innerJoin(users, eq(users.id, groupMembers.userId))
        .where(eq(groupMembers.groupId, groupId))

      // Get recent expenses
      const recentExpenses = await db
        .select({
          id: splitExpenses.id,
          description: splitExpenses.description,
          totalAmount: splitExpenses.totalAmount,
          splitType: splitExpenses.splitType,
          expenseDate: splitExpenses.expenseDate,
          createdBy: splitExpenses.createdBy,
          creatorName: sql<string>`(
            SELECT "firstName" || ' ' || "lastName" FROM users WHERE id = ${splitExpenses.createdBy}
          )`,
        })
        .from(splitExpenses)
        .where(eq(splitExpenses.groupId, groupId))
        .orderBy(desc(splitExpenses.expenseDate))
        .limit(10)

      return {
        success: true,
        data: {
          ...groupDetail,
          members,
          recentExpenses,
        },
      }
    } catch (error) {
      console.error("GroupService.getGroupDetails error:", error)
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get group details",
      }
    }
  }

  /**
   * Create a new group with members
   */
  async createGroup(
    name: string,
    createdBy: string,
    members: string[],
    options?: { description?: string; image?: string; type?: string }
  ) {
    try {
      // Insert group with new fields
      const [newGroup] = await db
        .insert(groups)
        .values({
          name,
          description: options?.description || null,
          image: options?.image || null,
          type: options?.type || "general",
          createdByUser: createdBy,
        })
        .returning()

      // Always include the creator as a member
      const allMembers = [...new Set([createdBy, ...members])]
      const memberInserts = allMembers.map((memberId) => ({
        groupId: newGroup.id,
        userId: memberId,
      }))
      await db.insert(groupMembers).values(memberInserts)

      return {
        success: true,
        data: newGroup,
      }
    } catch (error) {
      console.error("GroupService.createGroup ERROR:", error)
      if (error && typeof error === "object" && "query" in error) {
        console.error("Failed Query:", (error as any).query)
        console.error("Failed Params:", (error as any).params)
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create group",
      }
    }
  }

  /**
   * Add members to an existing group
   */
  async addMembers(groupId: string, members: string[]) {
    try {
      const memberInserts = members.map((userId) => ({
        groupId,
        userId,
      }))

      await db.insert(groupMembers).values(memberInserts).onConflictDoNothing()

      return { success: true, message: "Members added successfully." }
    } catch (error) {
      console.error("GroupService.addMembers error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to add members",
      }
    }
  }

  /**
   * Remove members from a group
   */
  async removeMembers(groupId: string, members: string[]) {
    try {
      const result = await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            inArray(groupMembers.userId, members)
          )
        )

      return {
        success: true,
        message: "Member(s) removed successfully.",
      }
    } catch (error) {
      console.error("GroupService.removeMembers error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to remove members",
      }
    }
  }

  /**
   * Delete a group and all its members
   */
  async deleteGroup(groupId: string) {
    try {
      // Delete members first (cascade should handle this, but explicit is better)
      await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId))

      // Delete the group
      const result = await db.delete(groups).where(eq(groups.id, groupId))

      return { success: true, message: "Group deleted successfully." }
    } catch (error) {
      console.error("GroupService.deleteGroup error:", error)
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete group",
      }
    }
  }

  /**
   * Update group details (name)
   */
  async updateGroupDetails(
    groupId: string,
    updates: {
      name?: string
      description?: string
      image?: string
      type?: string
    }
  ) {
    try {
      const setValues: Record<string, any> = {}
      if (updates.name !== undefined) setValues.name = updates.name
      if (updates.description !== undefined)
        setValues.description = updates.description
      if (updates.image !== undefined) setValues.image = updates.image
      if (updates.type !== undefined) setValues.type = updates.type

      if (Object.keys(setValues).length === 0) {
        return { success: false, message: "No fields to update" }
      }

      const result = await db
        .update(groups)
        .set(setValues)
        .where(eq(groups.id, groupId))
        .returning()

      if (result.length === 0) {
        return { success: false, message: "Group not found" }
      }

      return {
        success: true,
        data: result[0],
        message: "Group details updated successfully.",
      }
    } catch (error) {
      console.error("GroupService.updateGroupDetails error:", error)
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update group details",
      }
    }
  }

  /**
   * Get members of a group
   */
  async getGroupMembers(groupId: string) {
    try {
      const members = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
        })
        .from(groupMembers)
        .innerJoin(users, eq(users.id, groupMembers.userId))
        .where(eq(groupMembers.groupId, groupId))

      return {
        success: true,
        data: members,
      }
    } catch (error) {
      console.error("GroupService.getGroupMembers error:", error)
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get group members",
      }
    }
  }

  /**
   * Get activity feed for a specific group
   */
  async getGroupActivityFeed(
    groupId: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const offset = (page - 1) * limit

      const activities = await db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          targetUserId: activityLogs.targetUserId,
          splitExpenseId: activityLogs.splitExpenseId,
          action: activityLogs.action,
          description: activityLogs.description,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt,
          actorName: sql<string>`(
            SELECT "firstName" || ' ' || "lastName" FROM users WHERE id = ${activityLogs.userId}
          )`,
        })
        .from(activityLogs)
        .where(eq(activityLogs.groupId, groupId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset)

      return { success: true, data: activities }
    } catch (error) {
      console.error("GroupService.getGroupActivityFeed error:", error)
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get group activity feed",
      }
    }
  }
}

export default new GroupService()
