import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { r2Client, R2_BUCKET_NAME } from "../config/r2"
import fs from "fs"

/** Default presigned URL expiry: 1 hour */
const DEFAULT_EXPIRY = 3600

class MediaService {
  /**
   * Uploads a file buffer to R2.
   * @returns The R2 object key.
   */
  async uploadFile(
    key: string,
    filePath: string,
    contentType: string = "image/jpeg"
  ): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      })
    )

    // Clean up the temp file after upload
    fs.unlinkSync(filePath)

    return key
  }

  /**
   * Generates a presigned URL for reading a private R2 object.
   * @param key - The R2 object key (e.g. "users/123/profile")
   * @param expiresIn - URL validity in seconds (default: 1 hour)
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRY
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    return getSignedUrl(r2Client, command, { expiresIn })
  }

  /**
   * Deletes an object from R2.
   */
  async deleteFile(key: string): Promise<void> {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    )
  }

  /**
   * Uploads a user's profile picture and returns the presigned URL.
   * @returns { key, url } - The R2 key and a presigned URL for immediate use.
   */
  async uploadProfilePicture(
    userId: string,
    filePath: string,
    contentType: string = "image/jpeg"
  ): Promise<{ key: string; url: string }> {
    const key = `users/${userId}/profile`

    await this.uploadFile(key, filePath, contentType)
    const url = await this.getPresignedUrl(key)

    return { key, url }
  }

  /**
   * Gets a presigned URL for a user's profile picture.
   */
  async getProfilePictureUrl(userId: string): Promise<string> {
    const key = `users/${userId}/profile`
    return this.getPresignedUrl(key)
  }
}

export default new MediaService()
