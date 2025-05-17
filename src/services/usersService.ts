import pg from "pg"
import config from "../database"

class UsersService {
  async getUserById(userId: string) {
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
        text: `select id, "firstName" || ' ' || "lastName" as name, email, "profilePicture", "createdAt", "updatedAt" from users where id = $1`,
        values: [userId],
      })

      const user: any = result.rows?.[0]
      const { name, email, id, profilePicture, createdAt, updatedAt } = user
      return {
        success: true,
        message: "User fetched successfully",
        userId: id,
        user: { name, email, id, profilePicture, createdAt, updatedAt },
      }
    } catch (error) {
      console.log("🚀 ~ UsersService ~ getUserById ~ error:", error)
      return {
        success: false,
        message: error,
      }
    } finally {
      await dbClient?.end()
    }
  }

  async updateUser(userId: string, data: Record<string, any>) {
    let dbClient
    try {
      dbClient = new pg.Client(config)
      await dbClient.connect()
      console.log("Database connected successfully!")

      // Build the SET clause with parameterized values
      const keys = Object.keys(data)
      const values = Object.values(data)

      const setClause = keys
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ")

      // Final value for userId
      values.push(userId)

      await dbClient.query(
        `UPDATE users SET ${setClause} WHERE id = $${values.length}`,
        values
      )
      return {
        success: true,
        message: "User updated successfully",
      }
    } catch (error) {
      console.log("🚀 ~ updateUser ~ error:", error)
      return {
        success: false,
        message: (error as Error).message,
      }
    } finally {
      await dbClient?.end()
    }
  }

  async getProfilePic(userId: string) {
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
        text: `select profile_picture from users where id = $1`,
        values: [userId],
      })

      const user: any = result.rows?.[0]
      const { profile_picture } = user
      return {
        success: true,
        message: "Profile picture fetched successfully",
        profile_picture,
      }
    } catch (error) {
      console.log("🚀 ~ UsersService ~ getProfilePic ~ error:", error)
      return {
        success: false,
        message: error,
      }
    } finally {
      await dbClient?.end()
    }
  }
  async uploadProfilePic(userId: string, file: Express.Multer.File) {
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
        text: `update users set profile_picture = $1 where id = $2`,
        values: [file.path, userId],
      })

      return {
        success: true,
        message: "Profile picture uploaded successfully",
      }
    } catch (error) {
      console.log("🚀 ~ UsersService ~ uploadProfilePic ~ error:", error)
      return {
        success: false,
        message: error,
      }
    } finally {
      await dbClient?.end()
    }
  }
}

export default new UsersService()
