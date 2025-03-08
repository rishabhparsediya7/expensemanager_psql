import pg from "pg"
import config from "../database"

interface AddExpense {
  userId: string
  amount: number
  description: string
  category: number
}

class ExpenseService {
  // Add Expense
  async addExpense({ userId, amount, category, description }: AddExpense) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      // Insert expense
      const { rows: expense } = await dbClient.query({
        text: `INSERT INTO expenses ("user_id", "amount", "category_id", "description") 
               VALUES ($1, $2, $3, $4) 
               RETURNING *`,
        values: [userId, amount, category, description],
      })

      return { success: true, data: expense[0] }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ addExpense ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }

  // Get Expenses
  async getExpense({
    userId,
    expenseDate,
  }: {
    userId: string
    expenseDate: string
  }) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      const formattedDate = new Date(expenseDate).toISOString().split("T")[0]

      const { rows: expenses } = await dbClient.query({
        text: `SELECT * FROM expenses WHERE user_id = $1 AND DATE(created_at at time zone 'Asia/Kolkata') = $2;`,
        values: [userId, formattedDate],
      })
      await dbClient?.end()

      dbClient = new pg.Client(config)
      await dbClient.connect()

      const { rows: expenseAggregate } = await dbClient.query({
        text: `select count(*) , sum(amount) from expenses WHERE user_id = $1 AND DATE(created_at at time zone 'Asia/Kolkata') = $2;`,
        values: [userId, formattedDate],
      })

      console.log("🚀 ~ ExpenseService ~ getExpense ~ expenses:", expenses)

      return {
        success: true,
        data: expenses,
        totalCount: expenseAggregate?.[0]?.count || 0,
        totalSum: expenseAggregate?.[0]?.sum || 0,
      }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ getExpenses ~ error:", error)
      return { success: false, message: error }
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
  async getExpenseByDates(userId: string, startDate: string, endDate: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      const { rows: expenses } = await dbClient.query({
        text: `WITH date_series AS (
                    SELECT generate_series(
                        $1::DATE, 
                        $2::DATE, 
                        '1 day'::INTERVAL
                    )::DATE AS expense_date
                )
                SELECT 
                    ds.expense_date::TEXT as expense_date,  -- Convert DATE to TEXT
                    COALESCE(SUM(e.amount), 0) AS total_amount
                FROM date_series ds
                LEFT JOIN expenses e 
                    ON ds.expense_date = DATE(e.created_at)
                GROUP BY ds.expense_date
                ORDER BY ds.expense_date;
                `,
        values: [startDate, endDate],
      })

      return { success: true, data: expenses }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ getExpenseByDates ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }
  async getExpensByCategory(
    userId: string,
    startDate?: string,
    endDate?: string
  ) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()
      const { rows: expenses } = await dbClient.query({
        text: `SELECT 
                  cat.name, 
                  COALESCE(SUM(e.amount), 0) AS amount 
              FROM category cat
              LEFT JOIN expenses e 
                  ON cat.id = e.category_id 
                  AND e.user_id = $1
              GROUP BY cat.id, cat.name
              ORDER BY cat.id ASC;`,
        values: [userId],
      })
      return { success: true, data: expenses }
    } catch (error) {
      console.log("🚀 ~ ExpenseService ~ getExpensByCategory ~ error:", error)
      return { success: false, message: error }
    } finally {
      await dbClient?.end()
    }
  }
}

export default new ExpenseService()
