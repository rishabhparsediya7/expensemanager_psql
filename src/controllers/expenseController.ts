import { Request, Response } from "express"
import ExpenseService from "../services/expenseService"

// Add an Expense
export const addExpense = async (req: Request, res: Response) => {
  const { amount, description, category, expenseDate, paymentMethod } = req.body
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  if (!amount || !description || !category) {
    res.status(400).json({ success: false, message: "Missing required fields" })
    return
  }

  const response = await ExpenseService.addExpense({
    userId,
    amount,
    category,
    description,
    expenseDate,
    paymentMethodId: paymentMethod,
  })

  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

// Get Expenses for a user
export const getExpense = async (req: Request, res: Response) => {
  try {
    const userId = req?.userId

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Request" })
    }

    const {
      filter,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "expenseDate",
      sortOrder = "desc",
    } = req.query

    const filters = {
      filter: filter as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    }

    const response = await ExpenseService.getExpense({ userId, ...filters })

    if (response.success) {
      return res.status(200).json(response)
    } else {
      return res.status(400).json(response)
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error })
  }
}
// Update an Expense
export const updateExpense = async (req: Request, res: Response) => {
  const { expenseId, amount, description } = req.body

  if (!expenseId || !amount || !description) {
    res.status(400).json({ success: false, message: "Missing required fields" })
    return
  }
  const response = await ExpenseService.updateExpense({
    expenseId,
    amount,
    description,
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

// Delete an Expense
export const deleteExpense = async (req: Request, res: Response) => {
  const { expenseId } = req.params
  const response = await ExpenseService.deleteExpense(expenseId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

// Get Exepense Details
export const getExpenseDetails = async (req: Request, res: Response) => {
  const { expenseId } = req.params
  const response = await ExpenseService.getExpenseDetails(expenseId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

// Get Expenses by Dates
export const getExpenseByDates = async (req: Request, res: Response) => {
  const { userId, startDate, endDate } = req.body
  const response = await ExpenseService.getExpenseByDates(
    userId,
    startDate,
    endDate
  )
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getExpenseByCategory = async (req: Request, res: Response) => {
  const { userId, startDate, endDate } = req.body
  const response = await ExpenseService.getExpensByCategory(userId)
  if (response?.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const addBudget = async (req: Request, res: Response) => {
  const { type, amount } = req.body
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  const response = await ExpenseService.addBudget({
    userId,
    ...(type === "budget" ? { budget: amount } : { totalIncome: amount }),
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}
