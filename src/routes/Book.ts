import express from "express";
const router = express.Router();
import { Booking } from "../controllers/BookingBot";

router.post("/book", Booking);

export default router;