import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },

    body: {
      type: String,
      required: true
    },

    recipients: {
      type: [String],
      required: true
    },

    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "failed"
    }
  },
  {
    timestamps: true
  }
);

const Email = mongoose.model("Email", emailSchema);

export default Email;