import express from "express"
import {
  addExpense,
  deleteExpense,
  getExpenseDetails,
  getExpense,
  updateExpense,
  getExpenseByCategory,
  addBudget,
  getWeekChart,
} from "../controllers/expenseController"
import authenticateJWT from "../middlewares/authenticate"

const expenseRouter = express.Router()

expenseRouter.use(authenticateJWT)

expenseRouter.post("/add", addExpense)

expenseRouter.get("/", getExpense)

expenseRouter.post("/update", updateExpense)

expenseRouter.post("/delete/:expenseId", deleteExpense)

expenseRouter.post("/details/:expenseId", getExpenseDetails)

// get current week chart data
expenseRouter.get("/getWeekChart", getWeekChart)

// get expense by category
expenseRouter.get("/getExpenseByCategory", getExpenseByCategory)

// finance router
// add budget
// add income
expenseRouter.post("/finance", addBudget)

export default expenseRouter
