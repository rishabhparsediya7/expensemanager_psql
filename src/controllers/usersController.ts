import { Request, Response } from "express"
import UsersService from "../services/usersService"
export const getUserById = async (req: Request, res: Response) => {
  const { userId } = req.params

  if (!userId) {
    return res.status(400).json({ error: "Inputs are required - User ID" })
  }

  const response = await UsersService.getUserById(userId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}
