import express from "express"
import {
  addExpense,
  deleteExpense,
  getExpenseDetails,
  getExpense,
  updateExpense,
  getExpenseByDates,
} from "../controllers/expenseController"

const expenseRouter = express.Router()

expenseRouter.post("/add", addExpense)

expenseRouter.post("/date", getExpense)

expenseRouter.post("/update", updateExpense)

expenseRouter.post("/delete/:expenseId", deleteExpense)

expenseRouter.post("/details/:expenseId", getExpenseDetails)

expenseRouter.get("/dates/:startDate/:endDate", getExpenseByDates)

export default expenseRouter
