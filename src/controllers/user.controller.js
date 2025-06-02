import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  if (!email || !username || !password) {
    throw new ApiError(400, "All fields are required");
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
