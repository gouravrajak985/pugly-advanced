// Authentication Controller

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redisClient } from '../config/redisClient.js';
import { transporter, sendEMail } from "../services/emailService.js";

const generateAccessAndRefreshTokens = async (user) => {
  try {
    // const user = await User.findById(user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  // Checking if all required details are included or not. if not throw error
  if (
    [email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // Checking if user exist or not. If exist throw error.
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  // Not for Production will removed after development.
  try {
    await transporter.verify();
    console.log("Server is ready to take our messages");
  } catch (error) {
    throw new ApiError(400, "SMTP Server Verification failed");
  }
  // Generating, Hashing, Storing, Sending OTP
  //-Generating
  const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  };
  const otp = generateOTP(6); // e.g., "456789"
  //-Hashing
  const hashedOTP = (otp) => {
    return crypto.createHash("sha256").update(otp).digest("hex");
  };
  const hashed = hashedOTP(otp);
  //-Storing
  await redisClient.setEx(`otp:${email}`, 600, hashed); // 600 seconds = 10 mins
  //-Sending Mail
  const subject = "Your OTP (Valid for 10 Minutes)";
  const message = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Time-sensitive OTP Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 20px;
      color: #333333;
    }
    .email-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px 25px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 15px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #2a9d8f;
      letter-spacing: 4px;
      margin: 20px 0;
      text-align: center;
    }
    .expiry {
      background-color: #ffe5e5;
      color: #d00000;
      font-weight: 600;
      padding: 12px 15px;
      border-radius: 6px;
      text-align: center;
      font-size: 16px;
      margin-top: 10px;
    }
    .footer {
      font-size: 13px;
      color: #777777;
      margin-top: 30px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-container" role="main">
    <p class="greeting">Hello ${username},</p>
    <p>Your OTP code is:</p>
    <p class="otp-code">${otp}</p>
    <p class="expiry">This code will expire in <strong>10 minutes</strong>.</p>
    <p>If you did not request this code, please ignore this email.</p>
    <div class="footer">
      &copy; 2024 Your Company. All rights reserved.
    </div>
  </div>
</body>
</html>
`
  try {
    await sendEMail(email, subject, message);
  } catch (error) {
    throw new ApiError(500, "Failed to send OTP email");
  }

  // Creating User
  const user = await User.create({
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created and OTP sent successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const otpVerification = asyncHandler(async (req, res) => {
  const { email, inputOtp } = req.body;
  if (
    [email, inputOtp].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const storedHashedOtp = await redisClient.get(`otp:${email}`);
  if (!storedHashedOtp) {
    throw new ApiError(400, "OTP expired or not found");
  }
  const hashOTP = (otp) =>
    crypto.createHash("sha256").update(otp).digest("hex");

  const hashedInputOtp = hashOTP(inputOtp);
  if (hashedInputOtp !== storedHashedOtp) {
    throw new ApiError(400, "Invalid OTP");
  }

  try {
    await redisClient.del(`otp:${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { is_verified: true },
      { new: true }
    ).select("-password -refreshToken").lean();

    // Optional logging
    console.log(`User ${email} verified at ${new Date().toISOString()}`);

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "User verified successfully")
      );
  } catch (error) {
    // Optionally, you could attempt to restore OTP in Redis or notify admins
    throw new ApiError(500, "Failed to complete verification process");
  }

});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      is_verified: user.is_verified,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


export { registerUser, loginUser, logoutUser, refreshAccessToken, otpVerification, getUserProfile };