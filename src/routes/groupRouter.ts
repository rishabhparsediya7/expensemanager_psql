import express from "express"
import {  addMembers, createGroup, deleteGroup, getGroupDetails, getGroupList, removeMembers, updateGroupDetails } from "../controllers/groupController"

const groupRouter = express.Router()

groupRouter.get("/list", getGroupList)

groupRouter.post('/details/:id', getGroupDetails)

groupRouter.post('/create', createGroup)

groupRouter.post('/addMembers', addMembers)

groupRouter.post('/removeMembers', removeMembers)

groupRouter.post('/deleteGroup', deleteGroup)

groupRouter.post('/update', updateGroupDetails)

export default groupRouter
