import { Request, Response } from "express"
import ExpenseService from "../services/expenseService"

// Add an Expense
export const addExpense = async (req: Request, res: Response) => {
  const { userId, amount, description, category } = req.body
  const response = await ExpenseService.addExpense({
    userId,
    amount,
    category,
    description,
  })

  if (!userId || !amount || !description || !category) {
    res.status(400).json({ success: false, message: "Missing required fields" })
    return
  }

  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

// Get Expenses for a Group
export const getExpense = async (req: Request, res: Response) => {
  const { userId, expenseDate } = req.body
  if (!userId || !expenseDate) {
    res.status(400).json({ success: false, message: "Missing required fields" })
    return
  }
  const response = await ExpenseService.getExpense({ userId, expenseDate })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
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
