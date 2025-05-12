import express from "express"
import {
  addExpense,
  deleteExpense,
  getExpenseDetails,
  getExpense,
  updateExpense,
  getExpenseByDates,
  getExpenseByCategory,
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
expenseRouter.post("/getExpenseByDates", getExpenseByDates)

expenseRouter.post("/getExpenseByCategory", getExpenseByCategory)

export default expenseRouter
