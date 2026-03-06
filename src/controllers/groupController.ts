import { Request, Response } from "express"
import GroupService from "../services/groupService"
import GroupChatService from "../services/groupChatService"
import ActivityService from "../services/activityService"

export const getGroupList = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const response = await GroupService.getGroupList(userId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getGroupDetails = async (req: Request, res: Response) => {
  const groupId = req.params.id
  const userId = (req as any).userId
  const response = await GroupService.getGroupDetails(groupId, userId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const createGroup = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { name, members, description, image, type } = req.body
  const response = await GroupService.createGroup(name, userId, members || [], {
    description,
    image,
    type,
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const addMembers = async (req: Request, res: Response) => {
  const { groupId, members } = req.body
  const response = await GroupService.addMembers(groupId, members)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const removeMembers = async (req: Request, res: Response) => {
  const { groupId, members } = req.body
  const response = await GroupService.removeMembers(groupId, members)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const deleteGroup = async (req: Request, res: Response) => {
  const { groupId } = req.body
  const response = await GroupService.deleteGroup(groupId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const updateGroupDetails = async (req: Request, res: Response) => {
  const { groupId, name, description, image, type } = req.body
  const response = await GroupService.updateGroupDetails(groupId, {
    name,
    description,
    image,
    type,
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getGroupMembers = async (req: Request, res: Response) => {
  const groupId = req.params.id
  const response = await GroupService.getGroupMembers(groupId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getGroupActivityFeed = async (req: Request, res: Response) => {
  const groupId = req.params.id
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const response = await GroupService.getGroupActivityFeed(groupId, page, limit)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getGroupMessages = async (req: Request, res: Response) => {
  const groupId = req.params.id
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const response = await GroupChatService.getGroupMessages(groupId, page, limit)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const sendGroupMessage = async (req: Request, res: Response) => {
  const groupId = req.params.id
  const senderId = (req as any).userId
  const { message } = req.body
  const response = await GroupChatService.sendGroupMessage({
    groupId,
    senderId,
    message,
    messageType: "text",
  })
  if (response.success) {
    res.status(200).json(response)
  } else {
    const statusCode = (response as any).statusCode || 400
    res.status(statusCode).json(response)
  }
}

export const getUserActivityFeed = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const response = await ActivityService.getUserActivityFeed(
    userId,
    page,
    limit
  )
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getUnreadActivityCount = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const response = await ActivityService.getUnreadCount(userId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const markActivityAsRead = async (req: Request, res: Response) => {
  const { activityId } = req.body
  const response = await ActivityService.markAsRead(activityId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}
