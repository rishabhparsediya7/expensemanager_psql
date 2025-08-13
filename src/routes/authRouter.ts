import express from "express"
import {
  login,
  sendOTP,
  signinWithGoogle,
  signup,
  verifyOTP,
  updatePassword
} from "../controllers/authController"
import authenticateJWT from "../middlewares/authenticate"

const authRouter = express.Router()

authRouter.post("/signup", signup)

authRouter.post("/login", login)

authRouter.post("/verify-otp", verifyOTP)

authRouter.post("/send-otp", sendOTP)

authRouter.post("/signin-with-google", signinWithGoogle)

authRouter.use(authenticateJWT)
authRouter.put("/update-password", updatePassword)

export default authRouter
