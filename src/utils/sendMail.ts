import nodemailer from "nodemailer"
import pug from "pug"
import { convert } from "html-to-text"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendMail({ email, otp }: { email: string; otp: string }) {
  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.TRANSPORT_EMAIL,
      pass: process.env.TRANSPORT_PASSWORD,
    },
  })

  let mailOptions = {
    from: process.env.TRANSPORT_EMAIL,
    to: email,
    subject: "OTP for Verification",
    text: `Your OTP is: ${otp}. Please use this OTP to proceed.`,
  }
  let res = {
    sent: true,
    otp: otp,
  }
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("🚀 ~ transporter.sendMail ~ error:", error)
      res["sent"] = false
    }
  })
  return res
}

export const sendOTPEmail = async ({ email }: { email: string }) => {
  try {
    const otp = generateOTP()
    const templatePath = path.join(__dirname, "..", "views", "otp.pug")
    const html = pug.renderFile(templatePath, {
      otp,
    })

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.TRANSPORT_EMAIL,
        pass: process.env.TRANSPORT_PASSWORD,
      },
    })

    // Create mailOptions
    const mailOptions = {
      from: `Home Manager`,
      to: email,
      subject: "Your OTP for verification",
      text: convert(html),
      html,
    }
    // Send email
    const info = await transporter.sendMail(mailOptions)

    return otp
  } catch (error) {
    console.error("Error during send mail:", error)
    throw error
  }
}

export const sendVerificationEmail = async ({
  email,
  verificationCode,
}: {
  email: string
  verificationCode: string
}) => {
  try {
    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verifyemail/${verificationCode}`
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      "verificationCode.pug"
    )
    const html = pug.renderFile(templatePath, {
      verificationUrl,
    })

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.TRANSPORT_EMAIL,
        pass: process.env.TRANSPORT_PASSWORD,
      },
    })

    const mailOptions = {
      from: `Home Manager`,
      to: email,
      subject: "Email Verification",
      text: convert(html),
      html,
    }

    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw error
  }
}
