import mongoose from "mongoose";

const { Schema, model } = mongoose;

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // URL to the video file
      required: [true, "Video file URL is required"],
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail URL is required"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
    },
    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Video = model("Video", videoSchema);
