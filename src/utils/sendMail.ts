import nodemailer from "nodemailer"
import pug from "pug"
import { convert } from "html-to-text"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.TRANSPORT_EMAIL,
      pass: process.env.TRANSPORT_PASSWORD,
    },
  })
}

async function sendTemplateEmail({
  email,
  subject,
  templateName,
  data,
}: {
  email: string
  subject: string
  templateName: string
  data: any
}) {
  try {
    const templatePath = path.join(__dirname, "..", "views", templateName)
    const html = pug.renderFile(templatePath, data)

    const transporter = createTransporter()
    const mailOptions = {
      from: `Trakio <${process.env.TRANSPORT_EMAIL}>`,
      to: email,
      subject,
      text: convert(html),
      html,
    }
    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error) {
    console.error(`Error sending ${templateName} email:`, error)
    throw error
  }
}

export const sendSignupEmail = async ({
  email,
  otp,
}: {
  email: string
  otp: string
}) => {
  return sendTemplateEmail({
    email,
    subject: "Verify your email address",
    templateName: "signup.pug",
    data: { otp },
  })
}

export const sendForgotPasswordEmail = async ({
  email,
  otp,
}: {
  email: string
  otp: string
}) => {
  return sendTemplateEmail({
    email,
    subject: "Password Reset Request",
    templateName: "forgotPassword.pug",
    data: { otp },
  })
}

export const sendVerificationEmail = async ({
  email,
  verificationCode,
}: {
  email: string
  verificationCode: string
}) => {
  const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verifyemail/${verificationCode}`
  return sendTemplateEmail({
    email,
    subject: "Email Verification",
    templateName: "verificationCode.pug",
    data: { verificationUrl },
  })
}
