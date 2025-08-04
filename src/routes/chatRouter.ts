import { Router } from "express"
import pg from "pg"
import config from "../database"
import { getFriends, getHistory, getPublicKey, sendMessage, uploadPublicKey } from "../controllers/chatController"

const router = Router()

// Upload user public key
router.post('/upload-key', uploadPublicKey);

router.get('/public-key/:userId', getPublicKey);

router.post('/message', sendMessage);

router.get('/history', getHistory);

router.get('/getFriends/:userId', getFriends)

export default router
