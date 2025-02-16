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
        text: `SELECT * FROM users WHERE id = $1`,
        values: [userId],
      })

      const user: any = result.rows?.[0]
      const { first_name, last_name, email, id, profile_picture } = user
      return {
        success: true,
        message: "User fetched successfully",
        userId: id,
        user: { first_name, last_name, email, id, profile_picture },
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
}

export default new UsersService()
