import pg from "pg"
import config from "../database"
interface User {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  updatedAt: Date
}

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

      const firstName = data.name.split(" ")[0]
      const lastName = data.name.split(" ")[1]

      const dataObject: User = {
        firstName,
        lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        updatedAt: new Date(),
      }

      const setClause = Object.keys(dataObject)
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ")

      const clientQueryObject = {
        text: `UPDATE users SET ${setClause} WHERE id = $${Object.values(dataObject).length + 1}`,
        values: [...Object.values(dataObject), userId],
      }

      await dbClient.query(clientQueryObject)

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
