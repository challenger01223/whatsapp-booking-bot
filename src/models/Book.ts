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
        year: Number,
        month: Number,
        day: Number,
        hour: Number,
        min: Number
    },
    person: {
        type: String
    },
    step: {
        type: String
    },
    completed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

const Book = model("bookings", BookingSchema);

export default Book;