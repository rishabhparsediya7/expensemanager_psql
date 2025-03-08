import express from "express"
import {
  login,
  sendOTP,
  signup,
  verifyOTP,
} from "../controllers/authController"

const authRouter = express.Router()

authRouter.post("/signup", signup)

authRouter.post("/login", login)

authRouter.post("/verify-otp", verifyOTP)

authRouter.post("/send-otp", sendOTP)

export default authRouter
