import express from "express";
import { sendBulkMail } from "../controllers/mailController.js";

const router = express.Router();

router.post("/send", sendBulkMail);

export default router;