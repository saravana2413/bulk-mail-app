import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import mailRoutes from "./routes/mailRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/mail", mailRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Bulk Mail API is running"
  });
});

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });