// test-env.js
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

console.log("cwd:", process.cwd()); // current working dir
console.log(".env exists?", fs.existsSync(".env")); // true hona chahiye

console.log("==== ENV VARIABLES ====");
console.log("PORT:", process.env.PORT);
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET);
console.log("=======================");
