import nodemailer from "nodemailer"

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
