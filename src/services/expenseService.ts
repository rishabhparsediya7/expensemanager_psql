import { db } from "../db"
import {
  expenses,
  category,
  paymentMethod,
  users,
  userFinancialSummary,
} from "../db/schema"
import { eq, and, between, sql, desc, asc, sum } from "drizzle-orm"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

export type filterType =
  | "week"
  | "month"
  | "year"
  | "today"
  | "custom"
  | "category"
  | "paymentMethod"

dayjs.extend(isoWeek)
interface AddExpense {
  userId: string
  amount: number
  description: string
  category: number
  expenseDate?: string
  paymentMethodId?: number
}

class ExpenseService {
  // Add Expense
  async addExpense({
    userId,
    amount,
    category: categoryId,
    description,
    expenseDate,
    paymentMethodId,
  }: AddExpense) {
    try {
      // Insert expense
      const [newExpense] = await db
        .insert(expenses)
        .values({
          userId,
          amount: String(amount),
          categoryId,
          description,
          expenseDate: expenseDate || new Date().toISOString(),
          paymentMethodId,
        })
        .returning()

      return { success: true, data: newExpense }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ addExpense ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Bulk Add Expenses
  async bulkAddExpenses(
    userId: string,
    expenseList: Omit<AddExpense, "userId">[]
  ) {
    try {
      if (!expenseList || expenseList.length === 0) {
        return { success: true, data: [] }
      }

      const valuesToInsert = expenseList.map((exp) => ({
        userId,
        amount: String(exp.amount),
        categoryId: exp.category || null,
        description: exp.description,
        expenseDate: exp.expenseDate || new Date().toISOString(),
        paymentMethodId: exp.paymentMethodId || null,
      }))

      const insertedExpenses = await db
        .insert(expenses)
        .values(valuesToInsert)
        .returning()

      return { success: true, data: insertedExpenses }
    } catch (error) {
      console.error("🚀 ~ ExpenseService ~ bulkAddExpenses ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Get Expenses with filering
  // pagination, sorting and custom date range
  async getExpense({
    userId,
    filter,
    categoryId = null,
    paymentMethodId = null,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  }: {
    userId: string
    filter?: filterType
    categoryId?: string | null
    paymentMethodId?: string | null
    startDate?: string
    endDate?: string
    page: number
    limit: number
    sortBy: string
    sortOrder: string
  }) {
    try {
      let fromDate: string
      let toDate: string

      const now = dayjs()

      switch (filter) {
        case "week":
          fromDate = now.startOf("isoWeek").toISOString()
          toDate = now.endOf("isoWeek").toISOString()
          break
        case "month":
          fromDate = now.startOf("month").toISOString()
          toDate = now.endOf("month").toISOString()
          break
        case "year":
          fromDate = now.startOf("year").toISOString()
          toDate = now.endOf("year").toISOString()
          break
        case "today":
          fromDate = now.startOf("day").toISOString()
          toDate = now.endOf("day").toISOString()
          break
        case "custom":
          if (!startDate || !endDate) {
            throw new Error("Custom filter requires startDate and endDate")
          }
          fromDate = dayjs(startDate).startOf("day").toISOString()
          toDate = dayjs(endDate).endOf("day").toISOString()
          break
        case "category":
          if (!categoryId) {
            throw new Error("Category filter requires categoryId")
          }
          fromDate = "1970-01-01T00:00:00.000Z"
          toDate = now.endOf("day").toISOString()
          break
        case "paymentMethod":
          if (!paymentMethodId) {
            throw new Error("Payment Method filter requires paymentMethodId")
          }
          fromDate = "1970-01-01T00:00:00.000Z"
          toDate = now.endOf("day").toISOString()
          break
        default:
          fromDate = "1970-01-01T00:00:00.000Z"
          toDate = now.endOf("day").toISOString()
          break
      }

      const offset = (page - 1) * limit
      const whereClauses = [
        eq(expenses.userId, userId),
        between(expenses.expenseDate, fromDate, toDate),
      ]

      if (categoryId) {
        whereClauses.push(eq(expenses.categoryId, parseInt(categoryId)))
      }

      if (paymentMethodId) {
        whereClauses.push(
          eq(expenses.paymentMethodId, parseInt(paymentMethodId))
        )
      }

      const allowedSortBy = ["expenseDate", "amount", "createdAt"]
      const orderColumn =
        allowedSortBy.includes(sortBy) && sortBy in expenses
          ? expenses[sortBy as keyof typeof expenses]
          : expenses.expenseDate

      const orderDir = sortOrder.toLowerCase() === "asc" ? asc : desc

      const [expenseList, totalSumResult] = await Promise.all([
        db
          .select({
            id: expenses.id,
            userId: expenses.userId,
            amount: expenses.amount,
            categoryId: expenses.categoryId,
            description: expenses.description,
            expenseDate: expenses.expenseDate,
            createdAt: expenses.createdAt,
            updatedAt: expenses.updatedAt,
            paymentMethodId: expenses.paymentMethodId,
            category: category.name,
            paymentMethod: paymentMethod.name,
          })
          .from(expenses)
          .leftJoin(category, eq(expenses.categoryId, category.id))
          .leftJoin(
            paymentMethod,
            eq(expenses.paymentMethodId, paymentMethod.id)
          )
          .where(and(...whereClauses))
          .orderBy(orderDir(orderColumn as any), desc(expenses.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(and(...whereClauses)),
      ])

      return {
        success: true,
        data: expenseList,
        total: totalSumResult[0]?.total || "0",
        page,
        limit,
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Update Expense
  async updateExpense({
    expenseId,
    amount,
    description,
  }: {
    expenseId: string
    amount: number
    description: string
  }) {
    try {
      // Update expense
      await db
        .update(expenses)
        .set({
          amount: String(amount),
          description,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(expenses.id, expenseId))

      return { success: true, message: "Expense updated successfully." }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ updateExpense ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Delete Expense
  async deleteExpense(expenseId: string) {
    try {
      await db.delete(expenses).where(eq(expenses.id, expenseId))

      return { success: true, message: "Expense deleted successfully." }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ deleteExpense ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Get Expense Details
  // Note: This method was previously using tables/columns not found in current schema.
  // Refactoring to use the existing 'expenses' schema.
  async getExpenseDetails(expenseId: string) {
    try {
      // Query expense details
      const result = await db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          paidByUser: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(expenses)
        .innerJoin(users, eq(expenses.userId, users.id))
        .where(eq(expenses.id, expenseId))
        .limit(1)

      if (result.length === 0) {
        return { success: false, message: "Expense not found" }
      }

      // Note: expenseSplits table is missing from current Drizzle schema.
      // Returning empty splits for now to maintain API structure safely.
      return {
        success: true,
        data: {
          expense: result[0],
          splits: [],
        },
      }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ getExpenseDetails ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Get Expenses by Dates
  async getCurrentWeekChart(userId: string) {
    try {
      // 🗓️ Automatically get current week's Monday to Sunday
      const startDate = dayjs().startOf("isoWeek").format("YYYY-MM-DD")
      const endDate = dayjs().endOf("isoWeek").format("YYYY-MM-DD")

      const results = await db.execute(sql`
          WITH date_series AS (
            SELECT generate_series(
              ${startDate}::DATE,
              ${endDate}::DATE,
              '1 day'::INTERVAL
            )::DATE AS "expenseDate"
          )
          SELECT 
            ds."expenseDate"::TEXT as "expenseDate",
            COALESCE(SUM(e."amount"), 0) AS totalamount
          FROM date_series ds
          LEFT JOIN expenses e 
            ON ds."expenseDate" = DATE(e."expenseDate") 
            AND e."userId" = ${userId}
          GROUP BY ds."expenseDate"
          ORDER BY ds."expenseDate";
        `)

      return { success: true, data: results.rows }
    } catch (error) {
      console.log("🚀 ~ getWeekChart ~ error:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Get Expenses by Category
  async getExpensByCategory(userId: string) {
    try {
      const results = await db.execute(sql`
                WITH total AS (
                  SELECT COALESCE(SUM("amount"), 0) AS total_amount
                  FROM "expenses"
                  WHERE "userId" = ${userId}
                )
                SELECT 
                    cat."name",
                    COALESCE(SUM(e."amount"), 0) AS amount,
                    CASE 
                        WHEN t.total_amount = 0 THEN 0
                        ELSE ROUND(COALESCE(SUM(e."amount"), 0) * 100.0 / t.total_amount, 2)
                    END AS percentage
                FROM "category" cat
                LEFT JOIN "expenses" e 
                    ON cat."id" = e."categoryId" 
                    AND e."userId" = ${userId}
                CROSS JOIN total t
                GROUP BY cat."id", cat."name", t.total_amount
                ORDER BY cat."id" ASC;
        `)
      return { success: true, data: results.rows }
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  }

  async addOrUpdateBudgetForMonth({
    userId,
    budget,
    month: targetMonth,
    year: targetYear,
  }: {
    userId: string
    budget?: number
    month?: number
    year?: number
  }) {
    try {
      const month = targetMonth ?? parseInt(dayjs().format("MM"))
      const year = targetYear ?? parseInt(dayjs().format("YYYY"))

      await db
        .insert(userFinancialSummary)
        .values({
          userId,
          month,
          year,
          budget: budget ? String(budget) : null,
        })
        .onConflictDoUpdate({
          target: [
            userFinancialSummary.userId,
            userFinancialSummary.month,
            userFinancialSummary.year,
          ],
          set: { budget: budget ? String(budget) : null },
        })

      return {
        success: true,
        message: "Monthly budget updated successfully.",
      }
    } catch (error) {
      console.error(
        "Error in financeService (addOrUpdateBudgetForMonth):",
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }
    }
  }

  async addOrUpdateIncomeForMonth({
    userId,
    income,
    month: targetMonth,
    year: targetYear,
  }: {
    userId: string
    income?: number
    month?: number
    year?: number
  }) {
    try {
      const month = targetMonth ?? parseInt(dayjs().format("MM"))
      const year = targetYear ?? parseInt(dayjs().format("YYYY"))

      const incomeStr = income ? String(income) : null

      await db
        .insert(userFinancialSummary)
        .values({
          userId,
          month,
          year,
          totalIncome: incomeStr || "0",
        })
        .onConflictDoUpdate({
          target: [
            userFinancialSummary.userId,
            userFinancialSummary.month,
            userFinancialSummary.year,
          ],
          set: { totalIncome: incomeStr || "0" },
        })

      const summary = await db
        .select({
          totalIncome: userFinancialSummary.totalIncome,
          amountSpent: userFinancialSummary.amountSpent,
        })
        .from(userFinancialSummary)
        .where(
          and(
            eq(userFinancialSummary.userId, userId),
            eq(userFinancialSummary.month, month),
            eq(userFinancialSummary.year, year)
          )
        )
        .limit(1)

      if (summary.length > 0) {
        const totalIncome = parseFloat(summary[0].totalIncome || "0")
        const amountSpent = parseFloat(summary[0].amountSpent || "0")
        const amountSaved = totalIncome - amountSpent

        await db
          .update(userFinancialSummary)
          .set({ amountSaved: String(amountSaved) })
          .where(
            and(
              eq(userFinancialSummary.userId, userId),
              eq(userFinancialSummary.month, month),
              eq(userFinancialSummary.year, year)
            )
          )
      }

      return {
        success: true,
        message: "Monthly income updated successfully.",
      }
    } catch (error) {
      console.error(
        "Error in financeService (addOrUpdateIncomeForMonth):",
        error
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }
    }
  }

  // this will be only current month's summary
  async getUserFinanceSummary({
    userId,
    month,
    year,
  }: {
    userId: string
    month?: number
    year?: number
  }) {
    try {
      const targetMonth = month ?? parseInt(dayjs().format("MM"))
      const targetYear = year ?? parseInt(dayjs().format("YYYY"))

      const financeSummary = await db
        .select({
          month: userFinancialSummary.month,
          year: userFinancialSummary.year,
          budget: userFinancialSummary.budget,
          totalIncome: userFinancialSummary.totalIncome,
          amountSpent: userFinancialSummary.amountSpent,
          amountSaved: userFinancialSummary.amountSaved,
        })
        .from(userFinancialSummary)
        .where(
          and(
            eq(userFinancialSummary.userId, userId),
            eq(userFinancialSummary.month, targetMonth),
            eq(userFinancialSummary.year, targetYear)
          )
        )

      return {
        success: true,
        data: financeSummary,
      }
    } catch (error) {
      console.error("Error in financeService (getUserFinanceSummary):", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }
    }
  }

  // home page api to get current month's summary
  // last 5 transactions
  // budget, income and totalExpenses this month.
  async getHomeSummary({ userId }: { userId: string }) {
    try {
      const month = parseInt(dayjs().format("MM"))
      const year = parseInt(dayjs().format("YYYY"))

      const [last5Transactions, financeSummary] = await Promise.all([
        db
          .select({
            id: expenses.id,
            amount: expenses.amount,
            description: expenses.description,
            expenseDate: expenses.expenseDate,
            paymentMethodId: expenses.paymentMethodId,
            category: category.name,
            paymentMethod: paymentMethod.name,
          })
          .from(expenses)
          .innerJoin(category, eq(expenses.categoryId, category.id))
          .innerJoin(
            paymentMethod,
            eq(expenses.paymentMethodId, paymentMethod.id)
          )
          .where(eq(expenses.userId, userId))
          .orderBy(desc(expenses.expenseDate))
          .limit(5),
        db
          .select({
            budget: userFinancialSummary.budget,
            totalIncome: userFinancialSummary.totalIncome,
            amountSpent: userFinancialSummary.amountSpent,
            amountSaved: userFinancialSummary.amountSaved,
          })
          .from(userFinancialSummary)
          .where(
            and(
              eq(userFinancialSummary.userId, userId),
              eq(userFinancialSummary.month, month),
              eq(userFinancialSummary.year, year)
            )
          )
          .limit(1),
      ])

      return {
        success: true,
        data: {
          last5Transactions,
          financeSummary: financeSummary[0],
        },
      }
    } catch (error) {
      console.error("Error in financeService (getHomeSummary):", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }
    }
  }
}

export default new ExpenseService()
