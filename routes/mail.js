const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");

// Multer storage configuration
const storage = multer.diskStorage({
  destination: "./public/assets/mails", // Set your desired upload folder
  filename: (req, file, cb) => {
    cb(null, "post-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Route for sending emails
router.post("/send-mail", upload.single("image"), async (req, res) => {
  try {
    const { from_name, from_email, to_name, text } = req.body;

    // Create an SMTP transporter object
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    // Build email message
    const message = {
      from: `${from_name}`,
      to: `${to_name} <${process.env.USER}>`,
      subject: req.file ? "Fakebook bug report" : "User query",
      text: text,
      html: `
        <p>Mailed by <b>${from_name} ${from_email}</b></p>
        <p>${text}</p>
        `,
      attachments: [
        {
          filename: req.file.originalname,
          path: req.file.path,
          cid: "unique@nodemailer.com",
        },
      ],
    };
    // Send email
    const info = await transporter.sendMail(message);
    res.status(200).json({ message: "Email sent successfully", info });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
