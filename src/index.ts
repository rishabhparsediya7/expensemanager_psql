import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import { createServer } from "http"
import socketModule from "./socket" // 👈 this is your socket.ts
import usersRouter from "./routes/usersRouter"
import authRouter from "./routes/authRouter"
import groupRouter from "./routes/groupRouter"
import expenseRouter from "./routes/expenseRouter"
import chatRouter from "./routes/chatRouter"
import splitExpenseRouter from "./routes/splitExpenseRouter"
import notificationRouter from "./routes/notificationRouter"

dotenv.config()

const app = express()
const httpServer = createServer(app) // 👈 use this instead of app.listen()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", authRouter)
app.use("/api/users", usersRouter)
app.use("/api/group", groupRouter)
app.use("/api/expense", expenseRouter)
app.use("/api/chat", chatRouter)
app.use("/api/split", splitExpenseRouter)
app.use("/api/notifications", notificationRouter)

app.get("/", async (req, res) => {
  res.status(200).json({ message: "Welcome to the Master Server" })
})

// 🔌 Initialize Socket.IO
socketModule.initSocket(httpServer)

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})
