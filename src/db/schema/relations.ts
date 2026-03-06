import { relations } from "drizzle-orm/relations"
import {
  category,
  expenses,
  users,
  userFinancialSummary,
  messages,
  friends,
  userPassphrases,
  userKeys,
  groups,
  groupMembers,
  groupMessages,
  groupBalances,
  splitExpenses,
  splitExpenseParticipants,
  settlements,
  userBalances,
  activityLogs,
} from "./index"

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(category, {
    fields: [expenses.categoryId],
    references: [category.id],
    relationName: "expenses_category",
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
    relationName: "expenses_user",
  }),
}))

export const categoryRelations = relations(category, ({ many }) => ({
  expenses: many(expenses, {
    relationName: "expenses_category",
  }),
  splitExpenses: many(splitExpenses, {
    relationName: "splitExpenses_category",
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses, {
    relationName: "expenses_user",
  }),
  userFinancialSummaries: many(userFinancialSummary),
  receivedMessages: many(messages, {
    relationName: "messages_receiver",
  }),
  sentMessages: many(messages, {
    relationName: "messages_sender",
  }),
  friendsAsFriend: many(friends, {
    relationName: "friends_friendId",
  }),
  friendsAsUser: many(friends, {
    relationName: "friends_userId",
  }),
  userPassphrases: many(userPassphrases),
  userKeys: many(userKeys),
  // Split Expense relations
  createdSplitExpenses: many(splitExpenses, {
    relationName: "splitExpenses_creator",
  }),
  splitExpenseParticipations: many(splitExpenseParticipants, {
    relationName: "splitExpenseParticipants_user",
  }),
  settlementsPaid: many(settlements, {
    relationName: "settlements_payer",
  }),
  settlementsReceived: many(settlements, {
    relationName: "settlements_payee",
  }),
  balancesAsUser: many(userBalances, {
    relationName: "userBalances_user",
  }),
  balancesAsFriend: many(userBalances, {
    relationName: "userBalances_friend",
  }),
  // Group & Activity relations
  createdGroups: many(groups, {
    relationName: "groups_creator",
  }),
  groupMemberships: many(groupMembers, {
    relationName: "groupMembers_user",
  }),
  groupMessagesSent: many(groupMessages, {
    relationName: "groupMessages_sender",
  }),
  activityLogsPerformed: many(activityLogs, {
    relationName: "activityLogs_user",
  }),
  activityLogsReceived: many(activityLogs, {
    relationName: "activityLogs_target",
  }),
}))

export const userFinancialSummaryRelations = relations(
  userFinancialSummary,
  ({ one }) => ({
    user: one(users, {
      fields: [userFinancialSummary.userId],
      references: [users.id],
    }),
  })
)

export const messagesRelations = relations(messages, ({ one }) => ({
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "messages_receiver",
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "messages_sender",
  }),
}))

export const friendsRelations = relations(friends, ({ one }) => ({
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: "friends_friendId",
  }),
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: "friends_userId",
  }),
}))

export const userPassphrasesRelations = relations(
  userPassphrases,
  ({ one }) => ({
    user: one(users, {
      fields: [userPassphrases.userId],
      references: [users.id],
    }),
  })
)

export const userKeysRelations = relations(userKeys, ({ one }) => ({
  user: one(users, {
    fields: [userKeys.userId],
    references: [users.id],
  }),
}))

// ======================================
// Split Expense Relations
// ======================================

export const splitExpensesRelations = relations(
  splitExpenses,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [splitExpenses.createdBy],
      references: [users.id],
      relationName: "splitExpenses_creator",
    }),
    categoryRef: one(category, {
      fields: [splitExpenses.category],
      references: [category.id],
      relationName: "splitExpenses_category",
    }),
    group: one(groups, {
      fields: [splitExpenses.groupId],
      references: [groups.id],
      relationName: "splitExpenses_group",
    }),
    participants: many(splitExpenseParticipants, {
      relationName: "splitExpenseParticipants_expense",
    }),
    settlements: many(settlements, {
      relationName: "settlements_expense",
    }),
    activityLogs: many(activityLogs, {
      relationName: "activityLogs_expense",
    }),
  })
)

export const splitExpenseParticipantsRelations = relations(
  splitExpenseParticipants,
  ({ one }) => ({
    splitExpense: one(splitExpenses, {
      fields: [splitExpenseParticipants.splitExpenseId],
      references: [splitExpenses.id],
      relationName: "splitExpenseParticipants_expense",
    }),
    user: one(users, {
      fields: [splitExpenseParticipants.userId],
      references: [users.id],
      relationName: "splitExpenseParticipants_user",
    }),
  })
)

export const settlementsRelations = relations(settlements, ({ one }) => ({
  splitExpense: one(splitExpenses, {
    fields: [settlements.splitExpenseId],
    references: [splitExpenses.id],
    relationName: "settlements_expense",
  }),
  payer: one(users, {
    fields: [settlements.payerId],
    references: [users.id],
    relationName: "settlements_payer",
  }),
  payee: one(users, {
    fields: [settlements.payeeId],
    references: [users.id],
    relationName: "settlements_payee",
  }),
}))

export const userBalancesRelations = relations(userBalances, ({ one }) => ({
  user: one(users, {
    fields: [userBalances.userId],
    references: [users.id],
    relationName: "userBalances_user",
  }),
  friend: one(users, {
    fields: [userBalances.friendId],
    references: [users.id],
    relationName: "userBalances_friend",
  }),
}))

// ======================================
// Group Relations
// ======================================

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdByUser],
    references: [users.id],
    relationName: "groups_creator",
  }),
  members: many(groupMembers, {
    relationName: "groupMembers_group",
  }),
  expenses: many(splitExpenses, {
    relationName: "splitExpenses_group",
  }),
  messages: many(groupMessages, {
    relationName: "groupMessages_group",
  }),
  balances: many(groupBalances, {
    relationName: "groupBalances_group",
  }),
  activityLogs: many(activityLogs, {
    relationName: "activityLogs_group",
  }),
}))

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
    relationName: "groupMembers_group",
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
    relationName: "groupMembers_user",
  }),
}))

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  group: one(groups, {
    fields: [groupMessages.groupId],
    references: [groups.id],
    relationName: "groupMessages_group",
  }),
  sender: one(users, {
    fields: [groupMessages.senderId],
    references: [users.id],
    relationName: "groupMessages_sender",
  }),
}))

export const groupBalancesRelations = relations(groupBalances, ({ one }) => ({
  group: one(groups, {
    fields: [groupBalances.groupId],
    references: [groups.id],
    relationName: "groupBalances_group",
  }),
  user: one(users, {
    fields: [groupBalances.userId],
    references: [users.id],
    relationName: "groupBalances_user",
  }),
  friend: one(users, {
    fields: [groupBalances.friendId],
    references: [users.id],
    relationName: "groupBalances_friend",
  }),
}))

// ======================================
// Activity Log Relations
// ======================================

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
    relationName: "activityLogs_user",
  }),
  targetUser: one(users, {
    fields: [activityLogs.targetUserId],
    references: [users.id],
    relationName: "activityLogs_target",
  }),
  group: one(groups, {
    fields: [activityLogs.groupId],
    references: [groups.id],
    relationName: "activityLogs_group",
  }),
  splitExpense: one(splitExpenses, {
    fields: [activityLogs.splitExpenseId],
    references: [splitExpenses.id],
    relationName: "activityLogs_expense",
  }),
}))
