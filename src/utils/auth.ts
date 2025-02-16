import pg from "pg"
import config from "../database/index"

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
