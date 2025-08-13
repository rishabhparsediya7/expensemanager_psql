import { Request, Response } from "express"
import UsersService from "../services/usersService"
import cloudinary from "../config/cloudinary"
import fs from "fs"

export const getUserById = async (req: Request, res: Response) => {
  const userId = req?.userId

  if (!userId) {
    return res.status(400).json({ error: "Unauthorized User" })
  }

  const response = await UsersService.getUserById(userId)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}

export const getProfilePic = async (req: Request, res: Response) => {
  try {
    const userId = req?.userId

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized User" })
    }

    const signedUrl = cloudinary.url(`users/${userId}/profile`, {
      type: "private",
      resource_type: "image",
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
    })

    res.json({ url: signedUrl })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const uploadProfilePic = async (req: Request, res: Response) => {
  try {
    const userId = req?.userId

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized User" })
    }
    const filePath = req.file?.path

    if (!filePath) return res.status(400).json({ error: "No file uploaded" })

    const result = await cloudinary.uploader.upload(filePath, {
      folder: `users/${userId}`,
      public_id: "profile",
      type: "private",
      resource_type: "image",
      overwrite: true,
    })

    await UsersService.updateUser(userId, { profilePicture: result.secure_url })

    fs.unlinkSync(filePath)

    res.json({ message: "Uploaded successfully", asset_id: result.asset_id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}


export const updateProfile = async (req: Request, res: Response) => {
  const userId = req?.userId

  if (!userId) {
    return res.status(400).json({ error: "Unauthorized User" })
  }

  const response = await UsersService.updateUser(userId, req.body)
  if (response.success) {
    res.status(200).json(response)
  } else {
    res.status(400).json(response)
  }
}