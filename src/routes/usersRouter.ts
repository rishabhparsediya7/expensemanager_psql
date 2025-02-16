import express from "express"
import { getUserById } from "../controllers/usersController"

const userRouter = express.Router()

userRouter.get("/:userId", getUserById)

export default userRouter
