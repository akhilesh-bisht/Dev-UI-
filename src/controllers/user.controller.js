import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// generate Tokens

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

// register user

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;

  // Validate required fields
  if ([fullName, email, password, username].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // Get avatar and cover image paths
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : { url: "" };

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  // Create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong during registration");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// login user

export const loginUser = asyncHandler(async (req, res) => {
  // 1 - Get data from frontend
  const { email, username, password } = req.body;

  // 2 - Validate inputs
  if ((!email && !username) || !password) {
    throw new ApiError(400, "Email or username and password are required");
  }

  // 3 - Check if email or username exists
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "Email or username not registered");
  }

  // 4 - Check password
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    console.log(isPasswordCorrect);
    throw new ApiError(400, "Password does not match");
  }

  // 5 - Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // 6 - Remove sensitive data
  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 7 - Set cookies
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true in production
    sameSite: "strict",
  };

  // 8 - Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User login success"
      )
    );
});

// logout user

export const logoutUser = asyncHandler(async (req, res) => {
  try {
    // Update the user to clear the refreshToken in the database
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: undefined } }, // Remove refreshToken
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Clear cookies
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true in production
      sameSite: "strict",
    };

    // Clear the cookies from the client's browser
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    // Send response with success message
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { message: "User logged out successfully" },
          "Logout success"
        )
      );
  } catch (error) {
    throw new ApiError(500, error.message || "An error occurred during logout");
  }
});

// refresh access token

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized, refresh token is required");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRE
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "invalid refresh token, user not found");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(403, "invalid refresh token");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          { message: "Access token refreshed successfully" }
        )
      );
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new ApiError(500, "Failed to refresh access token");
  }
});

// change current password

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// GET current user details

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

// update account details

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Full name and email are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }.slect("-password ")
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update avatar image

export const updateAvatarImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Avatar upload failed");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password ");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// update cover image

export const updateCoverImage = asyncHandler(async (req, res) => {
  const localCoverImg = req.file?.path;
  if (!localCoverImg) {
    throw new ApiError(400, "cover image is required");
  }
  const coverImage = await uploadOnCloudinary(localCoverImg);
  if (!coverImage.url) {
    throw new ApiError(400, "cover image faild to upload in cloudnairy");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }.select("-password ")
  );
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});
