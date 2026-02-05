import express from "express"
import authenticateJWT from "../middlewares/authenticate"
import {
  createSplitExpense,
  getSplitExpenses,
  getSplitExpenseDetails,
  getUserBalances,
  getBalanceWithFriend,
  settleUp,
  getSettlementHistory,
  deleteSplitExpense,
  createSplitExpenseValidation,
  settleUpValidation,
} from "../controllers/splitExpenseController"

const splitExpenseRouter = express.Router()

// All routes require authentication
splitExpenseRouter.use(authenticateJWT)

// Split expense CRUD
splitExpenseRouter.post(
  "/create",
  createSplitExpenseValidation,
  createSplitExpense
)
splitExpenseRouter.get("/list", getSplitExpenses)
splitExpenseRouter.get("/details/:id", getSplitExpenseDetails)
splitExpenseRouter.delete("/:id", deleteSplitExpense)

// Balances
splitExpenseRouter.get("/balances", getUserBalances)
splitExpenseRouter.get("/balance/:friendId", getBalanceWithFriend)

// Settlements
splitExpenseRouter.post("/settle", settleUpValidation, settleUp)
splitExpenseRouter.get("/settlements/:friendId", getSettlementHistory)

export default splitExpenseRouter
