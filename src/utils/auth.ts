import pg from "pg"
import config from "../database/index"
import { OAuth2Client } from "google-auth-library"
const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID)

export async function updateOTP(email: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  const otpExpiration = new Date(
    Date.now() + Number(process.env.OTP_EXPIRATION_MINUTES) * 60 * 1000
  )

  let dbClient
  try {
    dbClient = new pg.Client(config)
    await dbClient.connect()
    await dbClient.query({
      text: `UPDATE users SET otp = $1, otpCreatedAt = $2, otpValidUntil=$3 WHERE email = $4`,
      values: [otp, new Date(), otpExpiration, email],
      rowMode: "array",
    })
    return otp
  } catch (error) {
    console.log("🚀 ~ sendOTP ~ error:", error)
  } finally {
    await dbClient?.end()
  }
}



export const verifyGoogleToken = async (idToken: string) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_WEB_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload) throw new Error("Invalid Google token")
  return payload
}
