import jwt from "jsonwebtoken"
import { NextFunction, Request, Response } from "express"
const JWT_SECRET = process.env.JWT_SECRET ?? ""

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token.",
      })
    }
    req.userId = decoded?.userId
    next()
  })
}

export default authenticateJWT
