import pg from "pg"
import config from "../database"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

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
    category,
    description,
    expenseDate,
    paymentMethodId,
  }: AddExpense) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      const values = [
        userId,
        amount,
        category,
        description,
        expenseDate,
        paymentMethodId,
      ]

      // Insert expense
      const { rows: expense } = await dbClient.query({
        text: `INSERT INTO expenses ("userId", "amount", "categoryId", "description", "expenseDate", "paymentMethodId") 
               VALUES ($1, $2, $3, $4, $5, $6) 
               RETURNING *`,
        values,
      })

      return { success: true, data: expense[0] }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ addExpense ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Get Expenses with filering
  // pagination, sorting and custom date range
  async getExpense({
    userId,
    filter,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  }: {
    userId: string
    filter?: string
    startDate?: string
    endDate?: string
    page: number
    limit: number
    sortBy: string
    sortOrder: string
  }) {
    const allowedSortBy = ["expenseDate", "amount", "createdAt"]
    const allowedSortOrder = ["asc", "desc"]

    // Ensure safe sort column and direction
    const sortColumn = allowedSortBy.includes(sortBy)
      ? `"${sortBy}"`
      : '"expenseDate"'
    const sortDirection = allowedSortOrder.includes(sortOrder.toLowerCase())
      ? sortOrder.toUpperCase()
      : "DESC"

    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      let fromDate: string
      let toDate: string

      const now = dayjs()

      // Handle different filter cases
      switch (filter) {
        case "week":
          fromDate = now.startOf("isoWeek").toISOString() // Get start of this week
          toDate = now.endOf("isoWeek").toISOString() // Get end of this week
          break
        case "month":
          fromDate = now.startOf("month").toISOString() // Start of the month
          toDate = now.endOf("month").toISOString() // End of the month
          break
        case "year":
          fromDate = now.startOf("year").toISOString() // Start of the year
          toDate = now.endOf("year").toISOString() // End of the year
          break
        case "today":
          fromDate = now.startOf("day").toISOString() // Start of today
          toDate = now.endOf("day").toISOString() // End of today
          break
        case "custom":
          if (!startDate || !endDate) {
            throw new Error("Custom filter requires startDate and endDate")
          }
          // Format custom date range with time (inclusive range)
          fromDate = dayjs(startDate).startOf("day").toISOString() // Start of custom date range
          toDate = dayjs(endDate).endOf("day").toISOString() // End of custom date range
          break
        default:
          // Default: get all expenses up until today
          fromDate = "1970-01-01T00:00:00.000Z" // From a distant past, to include all data
          toDate = now.endOf("day").toISOString() // Up until today
          break
      }

      console.log("fromDate", fromDate)
      console.log("toDate", toDate)

      const offset = (page - 1) * limit

      // Query to fetch the filtered expenses
      const expensesQuery = {
        text: `
          SELECT e.*, c.name as category, pm.name as "paymentMethod"
          FROM expenses e
          LEFT JOIN category c ON e."categoryId" = c.id
          LEFT JOIN "paymentMethod" pm ON e."paymentMethodId" = pm.id
          WHERE e."userId" = $1 AND e."expenseDate" BETWEEN $2 AND $3
          ORDER BY ${sortColumn} ${sortDirection}, e."createdAt" ${sortDirection}
          LIMIT $4 OFFSET $5
        `,
        values: [userId, fromDate, toDate, limit, offset],
      }

      // filter total expenses within query range
      const aggregateRangeQuery = {
        text: `
          SELECT SUM(amount) AS sum FROM expenses e
          WHERE e."userId" = $1 AND e."expenseDate" BETWEEN $2 AND $3
        `,
        values: [userId, fromDate, toDate],
      }

      // gives previous month total expenses.
      const aggregatePreviousMonthQuery = {
        text: `
          SELECT COUNT(*) AS count, SUM(amount) AS sum
          FROM expenses e
          WHERE e."userId" = $1
            AND e."expenseDate" >= date_trunc('month', NOW() - INTERVAL '1 month')
            AND e."expenseDate" < date_trunc('month', NOW())
        `,
        values: [userId],
      }

      // gives current month total expenses.
      const aggregateTotalMonthQuery = {
        text: `
          SELECT COUNT(*) AS count, SUM(amount) AS sum
          FROM expenses e
          WHERE e."userId" = $1
            AND e."expenseDate" >= date_trunc('month', NOW())
            AND e."expenseDate" < date_trunc('month', NOW() + INTERVAL '1 month')
        `,
        values: [userId],
      }

      const getUserFinanceSummaryQuery = {
        text: `
          SELECT "budget", "totalIncome"
          FROM "userFinancialSummary"
          WHERE "userId" = $1
        `,
        values: [userId],
      }

      const lastFourExpensesQuery = {
        text: `
          SELECT e.*, c.name as category, pm.name as "paymentMethod"
          FROM expenses e
          LEFT JOIN category c ON e."categoryId" = c.id
          LEFT JOIN "paymentMethod" pm ON e."paymentMethodId" = pm.id
          WHERE e."userId" = $1
          ORDER BY e."expenseDate" DESC
          LIMIT $2
        `,
        values: [userId, 5],
      }

      // Run both queries concurrently
      const [
        { rows: expenses },
        {
          rows: [aggMonth],
        },
        {
          rows: [agg],
        },
        {
          rows: [aggPreviousMonth],
        },
        {
          rows: [aggUserFinanceSummary],
        },
        { rows: lastFourExpenses },
      ] = await Promise.all([
        dbClient.query(expensesQuery),
        dbClient.query(aggregateTotalMonthQuery),
        dbClient.query(aggregateRangeQuery),
        dbClient.query(aggregatePreviousMonthQuery),
        dbClient.query(getUserFinanceSummaryQuery),
        dbClient.query(lastFourExpensesQuery),
      ])

      return {
        success: true,
        data: expenses,
        totalCount: parseInt(agg?.count || "0", 10),
        totalSum: parseFloat(agg?.sum || "0"),
        totalMonthSum: parseFloat(aggMonth?.sum || "0"),
        previousMonthSum: parseFloat(aggPreviousMonth?.sum || "0"),
        budget: parseFloat(aggUserFinanceSummary?.budget || "0"),
        totalIncome: parseFloat(aggUserFinanceSummary?.totalIncome || "0"),
        lastFourExpenses: lastFourExpenses,
        page,
        limit,
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      return { success: false, message: "Internal server error" }
    } finally {
      await dbClient?.end()
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
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      // Update expense
      await dbClient.query({
        text: `UPDATE "expenses" 
               SET "amount" = $1, "description" = $2 
               WHERE "id" = $3`,
        values: [amount, description, expenseId],
      })

      return { success: true, message: "Expense updated successfully." }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ updateExpense ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Delete Expense
  async deleteExpense(expenseId: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      await dbClient.query({
        text: `DELETE FROM "expenses" 
               WHERE "id" = $1`,
        values: [expenseId],
      })

      return { success: true, message: "Expense deleted successfully." }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ deleteExpense ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Get Balances
  async getExpenseDetails(expenseId: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      // Query expense details
      const { rows: expense } = await dbClient.query({
        text: `SELECT e."id", e."groupId", e."amount", e."description", e."splitType", u."name" AS "paidByUser" 
               FROM "expenses" e 
               JOIN "users" u ON e."paidByUser" = u."id" 
               WHERE e."id" = $1`,
        values: [expenseId],
      })

      if (expense.length === 0) {
        return { success: false, message: "Expense not found" }
      }

      // Query splits for the expense
      const { rows: splits } = await dbClient.query({
        text: `SELECT es."userId", es."amount", es."netBalance", es."transactionType", u."name" 
               FROM "expenseSplits" es 
               JOIN "users" u ON es."userId" = u."id" 
               WHERE es."expenseId" = $1`,
        values: [expenseId],
      })

      return {
        success: true,
        data: {
          expense: expense[0],
          splits,
        },
      }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ getExpenseDetails ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Get Expenses by Dates
  async getCurrentWeekChart(userId: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      // 🗓️ Automatically get current week's Monday to Sunday
      const startDate = dayjs().startOf("isoWeek").format("YYYY-MM-DD")
      const endDate = dayjs().endOf("isoWeek").format("YYYY-MM-DD")

      const { rows: expenses } = await dbClient.query({
        text: `
          WITH date_series AS (
            SELECT generate_series(
              $1::DATE,
              $2::DATE,
              '1 day'::INTERVAL
            )::DATE AS "expenseDate"
          )
          SELECT 
            ds."expenseDate"::TEXT as "expenseDate",
            COALESCE(SUM(e."amount"), 0) AS totalAmount
          FROM date_series ds
          LEFT JOIN expenses e 
            ON ds."expenseDate" = DATE(e."expenseDate") 
            AND e."userId" = $3
          GROUP BY ds."expenseDate"
          ORDER BY ds."expenseDate";
        `,
        values: [startDate, endDate, userId],
      })

      return { success: true, data: expenses }
    } catch (error) {
      console.log("🚀 ~ getWeekChart ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Get Expenses by Category
  async getExpensByCategory(userId: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()
      const { rows: expenses } = await dbClient.query({
        text: `WITH total AS (
                  SELECT COALESCE(SUM("amount"), 0) AS total_amount
                  FROM "expenses"
                  WHERE "userId" = $1
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
                    AND e."userId" = $1
                CROSS JOIN total t
                GROUP BY cat."id", cat."name", t.total_amount
                ORDER BY cat."id" ASC;
        `,
        values: [userId],
      })
      return { success: true, data: expenses }
    } catch (error) {
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  async addBudget({
    userId,
    budget,
    totalIncome,
  }: {
    userId: string
    budget?: number
    totalIncome?: number
  }) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      await dbClient.query({
        text: `INSERT INTO "userFinancialSummary" ("userId", "budget", "totalIncome") 
               VALUES ($1, $2, $3) 
               ON CONFLICT ("userId") 
               DO UPDATE SET 
                 "budget" = COALESCE($2, "userFinancialSummary"."budget"),
                 "totalIncome" = COALESCE($3, "userFinancialSummary"."totalIncome")`,
        values: [userId, budget ?? null, totalIncome ?? null],
      })

      return {
        success: true,
        message: `${budget ? "Budget" : "Total Income"} updated successfully.`,
      }
    } catch (error) {
      console.error("Error in financeService:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }
    } finally {
      await dbClient?.end()
    }
  }
}

export default new ExpenseService()
