import express from "express"
import authenticateJWT from "../middlewares/authenticate"
import {
  addMembers,
  createGroup,
  deleteGroup,
  getGroupDetails,
  getGroupList,
  getGroupMembers,
  removeMembers,
  updateGroupDetails,
  getGroupActivityFeed,
  getGroupMessages,
  sendGroupMessage,
  getUserActivityFeed,
  getUnreadActivityCount,
  markActivityAsRead,
} from "../controllers/groupController"

const groupRouter = express.Router()

// Apply JWT authentication to all group routes
groupRouter.use(authenticateJWT)

// Group CRUD
groupRouter.get("/list", getGroupList)
groupRouter.get("/details/:id", getGroupDetails)
groupRouter.post("/create", createGroup)
groupRouter.post("/addMembers", addMembers)
groupRouter.post("/removeMembers", removeMembers)
groupRouter.post("/deleteGroup", deleteGroup)
groupRouter.post("/update", updateGroupDetails)

// User activity feed & notifications (before /:id routes to avoid param conflict)
groupRouter.get("/activity/feed", getUserActivityFeed)
groupRouter.get("/activity/unread", getUnreadActivityCount)
groupRouter.post("/activity/read", markActivityAsRead)

// Group-specific routes (use :id param)
groupRouter.get("/:id/members", getGroupMembers)
groupRouter.get("/:id/activity", getGroupActivityFeed)
groupRouter.get("/:id/messages", getGroupMessages)
groupRouter.post("/:id/messages", sendGroupMessage)

export default groupRouter
