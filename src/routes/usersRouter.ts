import express from "express"
import multer from "multer"
import {
  getProfilePic,
  getUserById,
  uploadProfilePic,
} from "../controllers/usersController"
import authenticateJWT from "../middlewares/authenticate"

const userRouter = express.Router()

userRouter.use(authenticateJWT)

const upload = multer({ dest: "uploads/" })
userRouter.get("/me", getUserById)

// POST /upload-profile-pic
userRouter.post("/upload-profile-pic", upload.single("image"), uploadProfilePic)

// GET /profile-pic
userRouter.get("/profile-pic", getProfilePic)

export default userRouter
