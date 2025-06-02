import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;

    // upload the file to cloudinary
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(filePath);
    return response;
  } catch (err) {
    fs.unlinkSync(filePath); // remove the file from locally
    console.log("Error uploading file to cloudinary", err);
    throw new Error("Error uploading file to cloudinary");
  }
};

export { uploadOnCloudinary };
