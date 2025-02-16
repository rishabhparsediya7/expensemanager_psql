import dotenv from "dotenv"
dotenv.config()

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    // ca: fs.readFileSync("./ca.pem").toString(),
  },
}
export default config
