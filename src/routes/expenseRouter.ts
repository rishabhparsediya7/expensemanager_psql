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
  addIncome,
  getUserFinanceSummary,
  getHomeSummary,
} from "../controllers/expenseController"
import authenticateJWT from "../middlewares/authenticate"
import fs from "fs"
import path from "path"
import puppeteer from "puppeteer"
import { fileURLToPath } from "url"
import ExpenseService, { filterType } from "../services/expenseService"
import config from "../database"
import pg from "pg"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ReportData = {
  name: string
  userId: string
  reportDate: string
  reportContent: string
}

const expenseRouter = express.Router()

expenseRouter.use(authenticateJWT)

expenseRouter.post("/add", addExpense)

expenseRouter.get("/", getExpense)

expenseRouter.get("/get-home-summary", getHomeSummary)

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
expenseRouter.post("/add-budget", addBudget)
expenseRouter.post("/add-income", addIncome)
expenseRouter.get("/get-user-finance-summary", getUserFinanceSummary)

expenseRouter.get("/generate-report", async (req, res) => {
  const userId = req?.userId
  if (!userId) {
    return res.status(400).json({ success: false, message: "Invalid Request" })
  }

  let dbClient: pg.Client;
  dbClient = new pg.Client(config)
  await dbClient.connect()
  const user = await dbClient.query({
    text: "SELECT * FROM users WHERE id = $1",
    values: [userId],
  })

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

  const response = await ExpenseService.getExpense({
    userId,
    ...filters,
  })
  let expenses = response.data
  let totalAmount = response.total
    

  try {
    if (!expenses) {
      expenses = []
    }
    const expenseRowsHtml = expenses
      .map(
        (exp: any) => `
          <tr>
            <td>${exp.description}</td>
            <td>${exp.paymentMethod}</td>
            <td>${exp.expenseDate.toLocaleDateString("en-GB")}</td>
            <td class="align-right">₹${exp.amount}</td>
          </tr>
        `
      )
      .join("")

    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "report-template.html"
    )
    let htmlContent = fs.readFileSync(templatePath, "utf8")

    htmlContent = htmlContent
        .replace('{{reportDate}}', new Date().toLocaleDateString('en-GB'))
        .replace('{{userName}}', user.rows[0].firstName + " " + user.rows[0].lastName)
        .replace('{{userEmail}}', user.rows[0].email)
        .replace('{{expenseRows}}', expenseRowsHtml)
        .replace('{{totalCount}}', String(expenses.length))
        .replace('{{totalAmount}}', Number(totalAmount)?.toFixed(2));

    console.log("Launching Puppeteer...")
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()

    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    })

    await browser.close()
    console.log("PDF generated successfully.")

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf")
    res.end(pdfBuffer)
  } catch (error) {
    console.error("Error generating PDF:", error)
    res.status(500).send("Could not generate PDF. Please try again later.")
  }
  finally {
    await dbClient?.end()
  }
})

export default expenseRouter
