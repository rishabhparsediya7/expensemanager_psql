import { Request, Response } from "express";
import pg from 'pg'
import config from "../database";
import GroupService from "../services/groupService";


export const getGroupList = async (req: Request, res: Response) => {
  const { userId } = req.body
    const response  =await GroupService.getGroupList(userId) 
    if (response.success) {
        res.status(200).json(response)
      }
      else {
        res.status(400).json(response)
      }
}

export const getGroupDetails = async (req: Request, res: Response) => {
    const groupId = req.params.id
    const response  = await GroupService.getGroupDetails(groupId)
    if (response.success) {
      res.status(200).json(response)
    }
    else {
      res.status(400).json(response)
    }
}

export const createGroup = async (req: Request, res: Response) => {
    const {name, createdBy, members} = req.body
    const response  = await GroupService.createGroup(name, createdBy, members)
    if (response.success) {
      res.status(200).json(response)
    }
    else {
      res.status(400).json(response)
    }
}

export const addMembers = async (req: Request, res: Response) => {
  const {groupId, members} = req.body
  const response  = await GroupService.addMembers( groupId, members)
  if (response.success) {
    res.status(200).json(response)
  }
  else {
    res.status(400).json(response)
  }
}

export const removeMembers = async (req: Request, res: Response) => {
  const {groupId, members} = req.body
  const response  = await GroupService.removeMembers( groupId, members)
  if (response.success) {
    res.status(200).json(response)
  }
  else {
    res.status(400).json(response)
  }
}

export const deleteGroup = async (req: Request, res: Response) => {
  const {groupId, members} = req.body
  const response  = await GroupService.deleteGroup(groupId)
  if (response.success) {
    res.status(200).json(response)
  }
  else {
    res.status(400).json(response)
  }
}

export const updateGroupDetails = async (req: Request, res: Response) => {
  const {groupId, name} = req.body
  const response  = await GroupService.updateGroupDetails(groupId, name)
  if (response.success) {
    res.status(200).json(response)
  }
  else {
    res.status(400).json(response)
  }
}