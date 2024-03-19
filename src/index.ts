import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
dotenv.config();

import BookingRouter from "./routes/Book";

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/book', BookingRouter);

mongoose.connect(process.env.MONGO_URL as string)
    .then(() => {
        console.log("Connected to Mongo DB!!");
    }).catch((err) => console.log(err));

app.use(express.static(path.join(__dirname, '../client/build')));
app.use('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build', 'index.html')));

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});