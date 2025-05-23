import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Get token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // Check if token exists
    if (!token) {
      throw new ApiError(401, "Unauthorized - No token provided");
    }

    // Verify the token using the secret key
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Check if the user exists in the database using the decoded token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token - User not found");
    }

    // Attach the user to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Handle errors gracefully
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
