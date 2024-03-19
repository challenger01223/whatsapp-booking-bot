import { model, Schema } from "mongoose";

const BookingSchema = new Schema({
    phone: {
        type: String
    },
    price: {
        type: Number
    },
    service: {
        type: String
    },
    bookedAt: {
        dayTimestamp: Number,
        hourTimestamp: Number
    },
    person: {
        type: String
    },
    step: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

const Book = model("bookings", BookingSchema);

export default Book;