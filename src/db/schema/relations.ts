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
  splitExpenses,
  splitExpenseParticipants,
  settlements,
  userBalances,
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
    participants: many(splitExpenseParticipants, {
      relationName: "splitExpenseParticipants_expense",
    }),
    settlements: many(settlements, {
      relationName: "settlements_expense",
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
