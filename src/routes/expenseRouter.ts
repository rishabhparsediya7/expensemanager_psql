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

// will move the below routers to
// the charts expense router
expenseRouter.get("/getWeekChart", getWeekChart)

expenseRouter.post("/getExpenseByCategory", getExpenseByCategory)

// will move the below routers to the finance router
expenseRouter.post("/finance", addBudget)

export default expenseRouter
