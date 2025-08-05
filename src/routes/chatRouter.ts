import { Router } from "express"
import pg from "pg"
import config from "../database"
import { getFriends, getHistory, getUserKeys, sendMessage, uploadPassphrase, uploadKeys } from "../controllers/chatController"

const router = Router()

// Upload user public key
router.post('/upload-key', uploadKeys);

router.post('/upload-passphrase', uploadPassphrase)


router.get('/get-user-keys/:userId', getUserKeys);

router.post('/message', sendMessage);

router.get('/history', getHistory);

router.get('/getFriends/:userId', getFriends)

export default router
