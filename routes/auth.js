const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});

// *****register******
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, dob, gender } = req.body;

    // Check if the username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists." });
    }

    // Generate an OTP
    const otp = generateOTP();

    // Send OTP via email
    const mailOptions = {
      from: "fakebook",
      to: email,
      subject: "Verification OTP",
      text: `Your OTP for email verification is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user with the additional fields
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      dob, // Add date of birth
      gender, // Add gender
      otpDetails: {
        email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Set OTP expiration (5 minutes in this example)
      },
    });

    await newUser.save();

    res
      .status(201)
      .json({ message: "Verification OTP sent. Check your email." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while registering the user." });
  }
});

// Route for verifying the OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    // Check if the email and OTP match
    const existingUser = await User.findOne({
      "otpDetails.email": email,
      "otpDetails.otp": otp,
    });
    if (!existingUser) {
      return res.status(401).json({ error: "Invalid OTP or email." });
    }

    // Check if the OTP has expired
    const currentTime = new Date();
    if (existingUser.otpDetails.expiresAt < currentTime) {
      return res
        .status(401)
        .json({ error: "OTP has expired. Please request a new one." });
    }

    // Mark the email as verified and clear OTP details
    existingUser.emailVerified = true;
    existingUser.otpDetails = undefined;

    await existingUser.save();

    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while verifying the OTP." });
  }
});

// *****resend-otp******
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user with the given email exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ error: "User not found with the provided email." });
    }

    // Check if the OTP is expired
    const { otpDetails } = existingUser;

    // Generate a new OTP
    const newOtp = generateOTP();

    // Update the existing user's OTP details
    existingUser.otpDetails = {
      email,
      otp: newOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Set OTP expiration (5 minutes in this example)
    };

    // Save the updated user with the new OTP
    await existingUser.save();

    // Send the new OTP via email
    const mailOptions = {
      from: "fakebook",
      to: email,
      subject: "New Verification OTP",
      text: `Your new OTP for email verification is: ${newOtp}`,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ message: "New verification OTP sent. Check your email." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while resending the OTP." });
  }
});

// ******login*****
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user's email is verified
    if (!user.emailVerified) {
      // Generate a new OTP
      const otp = generateOTP();

      // Send the new OTP via email
      const mailOptions = {
        from: "fakebook",
        to: user.email,
        subject: "Verification OTP",
        text: `Your new OTP for email verification is: ${otp}`,
      };

      await transporter.sendMail(mailOptions);

      user.otpDetails = {
        email: user.email,
        otp: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await user.save();

      return res.status(401).json({
        error: "Email not verified. New OTP sent. Please verify your email.",
        otpSent: true,
      });
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({ error: "Wrong password" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
