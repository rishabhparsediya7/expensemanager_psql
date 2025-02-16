import { Request, Response } from "express"
import AuthService from "../services/authService"

export const signup = async (req: Request, res: Response) => {
  const { email, first_name, last_name, password } = req.body
  if (!email || !first_name || !last_name || !password) {
    return res
      .status(400)
      .json({ error: "Inputs are required - Email / First Name / Last Name" })
  }

  const response = await AuthService.signup(
    email,
    first_name,
    last_name,
    password
  )
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Inputs are required - Email/Name/Phone Number" })
  }
  const response = await AuthService.login(email, password)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" })
  }
  const response = await AuthService.verifyOTP(email, otp)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}
