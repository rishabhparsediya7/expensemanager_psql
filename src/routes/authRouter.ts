import express from "express"
import {
  login,
  sendOTP,
  signinWithGoogle,
  signup,
  verifyOTP,
} from "../controllers/authController"

const authRouter = express.Router()

authRouter.post("/signup", signup)

authRouter.post("/login", login)

authRouter.post("/verify-otp", verifyOTP)

authRouter.post("/send-otp", sendOTP)

authRouter.post("/signin-with-google", signinWithGoogle)

export default authRouter
