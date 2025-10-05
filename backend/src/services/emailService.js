import nodemailer from "nodemailer"
import { ApiError } from "../utils/ApiError.js";
import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})

console.log("Loaded PORT:", `${process.env.PORT}`);

// Create a account with credentials
const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: process.env.SMTPPORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.USER,
        pass: process.env.PASS,
    },
});

// Send Mail
const sendEMail = async (email, subject, message) => {
    try {
        await transporter.sendMail({
            from: process.env.FROM,
            to: `${email}`,
            subject: `${subject}`,
            text: `${message}`, // plain‑text body
            html: `${message}`, // HTML body
        });
    } catch (error) {
        console.error("Error sending email:", error);
        throw new ApiError(400,"Email could not be sent");
    }
}

export { transporter, sendEMail };