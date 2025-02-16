import express from "express"
import { login, signup, verifyOTP } from "../controllers/authController"

const authRouter = express.Router()

authRouter.post("/signup", signup)

authRouter.post("/login", login)

authRouter.post("/verify-otp", verifyOTP)

export default authRouter
