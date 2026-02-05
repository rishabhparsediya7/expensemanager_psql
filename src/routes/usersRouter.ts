import express, { RequestHandler } from "express"
import multer from "multer"
import {
  getProfilePic,
  getUserById,
  uploadProfilePic,
  updateProfile,
} from "../controllers/usersController"
import authenticateJWT from "../middlewares/authenticate"

const userRouter = express.Router()

userRouter.use(authenticateJWT)

const upload = multer({ dest: "uploads/" })
userRouter.get("/me", getUserById)

userRouter.put("/update-profile", updateProfile)

// POST /upload-profile-pic
// Cast to RequestHandler to fix type mismatch between multer and express types
userRouter.post(
  "/upload-profile-pic",
  upload.single("image") as unknown as RequestHandler,
  uploadProfilePic
)

// GET /profile-pic
userRouter.get("/profile-pic", getProfilePic)

export default userRouter
