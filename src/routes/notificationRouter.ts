import { Router } from "express"
import authenticateJWT from "../middlewares/authenticate"
import {
  registerToken,
  unregisterToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController"

const router = Router()

router.use(authenticateJWT)

// FCM Token management
router.post("/register-token", registerToken)
router.post("/unregister-token", unregisterToken)

// In-app notification inbox
router.get("/me", getNotifications)
router.patch("/me/read-all", markAllAsRead)

router.get("/:userId", getNotifications)
router.patch("/:notificationId/read", markAsRead)
router.patch("/:userId/read-all", markAllAsRead)

export default router
