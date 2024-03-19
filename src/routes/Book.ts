import express from "express";
const router = express.Router();
import { Booking, BookingData } from "../controllers/BookingBot";

router.post("/", Booking);
router.get("/", BookingData);

export default router;