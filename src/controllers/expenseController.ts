import { Request, Response } from "express"
import ExpenseService, { filterType } from "../services/expenseService"

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
      categoryId,
      paymentMethodId,
    } = req.query

    const filters = {
      filter: filter as filterType,
      startDate: startDate as string,
      endDate: endDate as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
      categoryId: categoryId as string,
      paymentMethodId: paymentMethodId as string,
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
export const getWeekChart = async (req: Request, res: Response) => {
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  try {
    const response = await ExpenseService.getCurrentWeekChart(userId)
    res.status(response.success ? 200 : 400).json(response)
  } catch (error) {
    res.status(500).json({ success: false, message: error })
  }
}

export const getExpenseByCategory = async (req: Request, res: Response) => {
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  try {
    const response = await ExpenseService.getExpensByCategory(userId)
    if (response?.success) {
      res.status(200).json(response)
    } else {
      res.status(400).json(response)
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error })
  }
}

// add budget and income
export const addBudget = async (req: Request, res: Response) => {
  const { amount, month, year } = req.body
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  const response = await ExpenseService.addOrUpdateBudgetForMonth({
    userId,
    budget: amount,
    month,
    year,
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const addIncome = async (req: Request, res: Response) => {
  const { amount, month, year } = req.body
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  const response = await ExpenseService.addOrUpdateIncomeForMonth({
    userId,
    income: amount,
    month,
    year,
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getUserFinanceSummary = async (req: Request, res: Response) => {
  const userId = req?.userId
  const { month, year } = req.body

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  try {
    const response = await ExpenseService.getUserFinanceSummary({
      userId,
      month,
      year,
    })
    if (response?.success) {
      res.status(200).json(response)
    } else {
      res.status(400).json(response)
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error })
  }
}

export const getHomeSummary = async (req: Request, res: Response) => {
  const userId = req?.userId

  if (!userId) {
    res.status(400).json({ success: false, message: "Invalid Request" })
    return
  }

  try {
    const response = await ExpenseService.getHomeSummary({ userId })
    if (response?.success) {
      res.status(200).json(response)
    } else {
      res.status(400).json(response)
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error })
  }
}