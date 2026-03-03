import { Router } from "express"
import {
  getFriends,
  getHistory,
  getPendingSplinks,
  getSentSplinks,
  getUserKeys,
  respondToSplinkRequest,
  sendMessage,
  sendSplinkRequest,
  uploadKeys,
  uploadPassphrase,
} from "../controllers/chatController"
import authenticateJWT from "../middlewares/authenticate"

const router = Router()

// Apply JWT authentication to all chat routes
router.use(authenticateJWT)

// Upload user public key
router.post("/upload-key", uploadKeys)

router.post("/upload-passphrase", uploadPassphrase)

router.get("/get-user-keys/:userId", getUserKeys)

router.post("/message", sendMessage)

router.get("/history", getHistory)

router.get("/getFriends/:userId", getFriends)

router.post("/splink/request", sendSplinkRequest)
router.post("/splink/response", respondToSplinkRequest)
router.get("/splink/pending", getPendingSplinks)
router.get("/splink/sent", getSentSplinks)

export default router
