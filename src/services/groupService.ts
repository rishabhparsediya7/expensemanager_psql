import { db } from "../db"
import { groups, groupMembers, users } from "../db/schema"
import { eq, and, inArray } from "drizzle-orm"

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

      // Get group details
      const groupsList = await db
        .select()
        .from(groups)
        .where(inArray(groups.id, groupIds))

      return {
        success: true,
        data: groupsList,
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
  async getGroupDetails(groupId: string) {
    try {
      const groupDetails = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))

      if (groupDetails.length === 0) {
        return {
          success: false,
          message: "Group not found",
        }
      }

      return {
        success: true,
        data: groupDetails[0],
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
  async createGroup(name: string, createdBy: string, members: string[]) {
    try {
      // Insert group
      const [newGroup] = await db
        .insert(groups)
        .values({
          name,
          createdByUser: createdBy,
        })
        .returning()

      // Add members to the group
      if (members.length > 0) {
        const memberInserts = members.map((memberId) => ({
          groupId: newGroup.id,
          userId: memberId,
        }))
        await db.insert(groupMembers).values(memberInserts)
      }

      return {
        success: true,
        data: newGroup,
      }
    } catch (error) {
      console.error("GroupService.createGroup error:", error)
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
  async updateGroupDetails(groupId: string, name: string) {
    try {
      const result = await db
        .update(groups)
        .set({ name })
        .where(eq(groups.id, groupId))
        .returning()

      if (result.length === 0) {
        return { success: false, message: "Group not found" }
      }

      return { success: true, message: "Group details updated successfully." }
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
}

export default new GroupService()
