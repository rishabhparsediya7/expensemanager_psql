import { Request, Response } from "express"
import { body, param, validationResult } from "express-validator"
import SplitExpenseService from "../services/splitExpenseService"

// Validation middleware
export const createSplitExpenseValidation = [
  body("description").notEmpty().withMessage("Description is required"),
  body("totalAmount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("participants")
    .isArray({ min: 1 })
    .withMessage("At least one participant is required"),
  body("participants.*.userId")
    .isUUID()
    .withMessage("Invalid participant userId"),
  body("participants.*.amountOwed")
    .isFloat({ min: 0 })
    .withMessage("Amount owed must be non-negative"),
  body("paidBy").isUUID().withMessage("paidBy must be a valid userId"),
]

export const settleUpValidation = [
  body("splitExpenseId").isUUID().withMessage("Invalid split expense ID"),
  body("payerId").isUUID().withMessage("Invalid payer ID"),
  body("payeeId").isUUID().withMessage("Invalid payee ID"),
  body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be positive"),
]

/**
 * Create a new split expense
 */
export const createSplitExpense = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const {
      description,
      totalAmount,
      category,
      participants,
      expenseDate,
      paidBy,
    } = req.body
    const createdBy = req.userId

    const result = await SplitExpenseService.createSplitExpense({
      createdBy,
      description,
      totalAmount,
      category,
      participants,
      expenseDate,
      paidBy,
    })

    if (result.success) {
      return res.status(201).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error("createSplitExpense error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Get all split expenses for the authenticated user
 */
export const getSplitExpenses = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const result = await SplitExpenseService.getSplitExpenses(userId)
    return res.status(200).json(result)
  } catch (error) {
    console.error("getSplitExpenses error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Get details of a specific split expense
 */
export const getSplitExpenseDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await SplitExpenseService.getSplitExpenseDetails(id)

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(404).json(result)
    }
  } catch (error) {
    console.error("getSplitExpenseDetails error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Get all balances with friends
 */
export const getUserBalances = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const result = await SplitExpenseService.getUserBalances(userId)
    return res.status(200).json(result)
  } catch (error) {
    console.error("getUserBalances error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Get balance with a specific friend
 */
export const getBalanceWithFriend = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { friendId } = req.params
    const result = await SplitExpenseService.getBalanceWithFriend(
      userId,
      friendId
    )
    return res.status(200).json(result)
  } catch (error) {
    console.error("getBalanceWithFriend error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Settle up - record a payment
 */
export const settleUp = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { splitExpenseId, payerId, payeeId, amount, note } = req.body
    const result = await SplitExpenseService.settleUp({
      splitExpenseId,
      payerId,
      payeeId,
      amount,
      note,
    })

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error("settleUp error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Get settlement history with a friend
 */
export const getSettlementHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { friendId } = req.params
    const result = await SplitExpenseService.getSettlementHistory(
      userId,
      friendId
    )
    return res.status(200).json(result)
  } catch (error) {
    console.error("getSettlementHistory error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}

/**
 * Delete a split expense
 */
export const deleteSplitExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const result = await SplitExpenseService.deleteSplitExpense(id, userId)

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error("deleteSplitExpense error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }
}
