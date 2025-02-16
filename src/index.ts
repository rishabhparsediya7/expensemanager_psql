import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import usersRouter from "./routes/usersRouter"
import authRouter from "./routes/authRouter"
import groupRouter from "./routes/groupRouter"
import expenseRouter from "./routes/expenseRouter"
import authenticateJWT from "./middlewares/authenticate"
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", authRouter)

// app.use(authenticateJWT)

app.use("/api/users", usersRouter)
app.use("/api/group", groupRouter)
app.use("/api/expense", expenseRouter)

app.get("/", async (req, res) => {
  res.status(200).json({ message: "Welcome to the K-Server" })
})

// Start server
app.listen(PORT, async () => {
  console.log("Server is running at http://localhost:" + PORT)
})
