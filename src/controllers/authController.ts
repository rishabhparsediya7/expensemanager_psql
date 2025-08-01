import { Request, Response } from "express"
import AuthService from "../services/authService"
import { verifyGoogleToken } from "../utils/auth"


export const signinWithGoogle = async (req: Request, res: Response) => {
  const idToken = req.headers['id-token'] as string
  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" })
  }
  const payload = await verifyGoogleToken(idToken)
  const response = await AuthService.findOrCreate(payload.email!, payload.given_name!, payload.family_name!, payload.picture!)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const signup = async (req: Request, res: Response) => {
  const { email, firstName, lastName, password } = req.body
  if (!email || !firstName || !lastName || !password) {
    console.log(email, firstName, lastName, password)
    return res
      .status(400)
      .json({ error: "Inputs are required - Email / First Name / Last Name" })
  }

  const response = await AuthService.signup(
    email,
    firstName,
    lastName,
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

export const sendOTP = async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: "Email is required" })
  }
  const response = await AuthService.sendOTP(email)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}
