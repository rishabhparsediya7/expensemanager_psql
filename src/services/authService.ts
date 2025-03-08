import pg from "pg"
import config from "../database"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const JWT_SECRET = process.env.JWT_SECRET ?? ""
const JWT_EXPIRATION_MINUTES = process.env.JWT_EXPIRATION_MINUTES
class AuthService {
  async signup(
    email: string,
    first_name: string,
    last_name: string,
    password: string
  ) {
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)
    let dbClient
    try {
      dbClient = new pg.Client(config)
      dbClient
        .connect()
        .then(() => {
          console.log("database connected sucesfully!")
        })
        .catch((err) => console.log(err))
      const result = await dbClient.query({
        text: `INSERT INTO users (email, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id`,
        values: [email, first_name, last_name, passwordHash],
        rowMode: "array",
      })

      const userId = result.rows?.[0]?.[0]
      const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: `${JWT_EXPIRATION_MINUTES}m`,
      })

      return {
        success: true,
        message: "User Entry created",
        token,
        userId,
      }
    } catch (error) {
      console.log("🚀 ~ AuthServices ~ singup ~ error:", error)

      return {
        success: false,
        message: error,
      }
    } finally {
      await dbClient?.end()
    }
  }

  async login(email: string, password: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()

      // Retrieve the user by email
      const result = await dbClient.query({
        text: "SELECT * FROM users WHERE email = $1",
        values: [email],
      })

      // If user not found
      if (result.rows.length === 0) {
        return {
          success: false,
          message: "User not found",
        }
      }

      const user = result.rows[0]

      // Compare the provided password with the stored password hash
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)

      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid password",
        }
      }

      const token = jwt.sign(
        { userId: user.id }, // Assuming user.id is the user's unique identifier
        JWT_SECRET,
        { expiresIn: `${JWT_EXPIRATION_MINUTES}m` } // Token expiration
      )

      return {
        success: true,
        message: "Login successful",
        name: user.first_name + " " + user.last_name,
        token,
        userId: user.id,
      }
    } catch (error) {
      console.log("🚀 ~ AuthServices ~ login ~ error:", error)
      return {
        success: false,
        message: "Login failed",
      }
    } finally {
      await dbClient?.end()
    }
  }

  async sendOTP(email: string) {
    console.log("🚀 ~ AuthService ~ sendOTP ~ email:", email)
    let dbClient
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      dbClient = new pg.Client(config)
      await dbClient.connect()
      const { rows } = await dbClient.query({
        text: "update users set otp = $1 where email = $2 returning *",
        values: [otp, email],
      })
      if (rows.length === 0) {
        return { success: false, message: "User not found" }
      }
      const user = rows[0]
      const otpExpiration = new Date(user.otp_created_at)
      otpExpiration.setMinutes(
        otpExpiration.getMinutes() +
          parseInt(String(process.env.OTP_EXPIRATION_MINUTES))
      )
      return {
        success: true,
        email: user.email,
        message: "OTP sent successfully",
        otp,
        otpExpiration,
      }
    } catch (error) {
      console.log("🚀 ~ AuthServices ~ sendOTP ~ error:", error)
      return { success: false, message: "Failed to send OTP" }
    } finally {
      await dbClient?.end()
    }
  }

  async verifyOTP(email: string, otp: string) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()
      const users = await dbClient.query({
        text: "SELECT otp, otp_created_at, otp_expires_in FROM users WHERE email = $1",
        values: [email],
      })
      await dbClient.end()

      if (users.rows.length === 0) {
        return { success: false, message: "User not found" }
      }

      const user = users.rows[0]

      if (user.otp !== otp) {
        return { success: false, message: "Invalid OTP" }
      }

      if (new Date() > user.otp_expires_in) {
        return { success: false, message: "OTP expired" }
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: `${JWT_EXPIRATION_MINUTES}m`,
      })

      return { success: true, message: "Email verified successfully", token }
    } catch (error) {
      console.log("🚀 ~ AuthServices ~ verifyOTP ~ error:", error)
      return { success: false, message: "Failed to verify OTP" }
    } finally {
      await dbClient?.end()
    }
  }
}

export default new AuthService()
