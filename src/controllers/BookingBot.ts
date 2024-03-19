import { Request, Response, NextFunction } from "express";
import { twiml } from "twilio";
import { SERVICES, MONTHS, SERVICE_PRICES } from "../utils/constants";
const { MessagingResponse } = twiml;
import Book from "../models/Book";

type IUser = {
  WaId: string;
  ProfileName: string;
};

let currentUser: IUser | null = null;

const ServiceSelection = () => {
  let str = `Hi, ${currentUser?.ProfileName}. What service would you like to book?\n`;

  SERVICES.forEach((service: string, index: number) => {
    str += `${index + 1} - ${service} ($${SERVICE_PRICES[index]})\n`;
  });
  return str;
};

const getDayFormat = (date: Date) => {
  let month = MONTHS[date.getMonth()];
  let day = date.getDate();
  let year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const convertToTwoDigits = (num: number) => {
  return num < 10 ? '0' + num : num;
}

const DaySelection = () => {
  const date = new Date();
  const secondDate = new Date();
  const thirdDate = new Date();
  const fourthDate = new Date();
  secondDate.setDate(date.getDate() + 1);
  thirdDate.setDate(date.getDate() + 2);
  fourthDate.setDate(date.getDate() + 3);
  return `When would you like to book?\n1 - ${getDayFormat(date)} (today)\n2 - ${getDayFormat(secondDate)}\n3 - ${getDayFormat(thirdDate)}\n4 - ${getDayFormat(fourthDate)}`;
};

const WrongMessage = () => {
  return "Wrong message.";
};

export const Booking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { Body, WaId, ProfileName } = req.body;
  currentUser = { WaId, ProfileName };
  let result: any = null;
  const booking = await Book.findOne({ phone: currentUser?.WaId }).sort({
    createdAt: "asc",
  });

  try {
    if (booking) {
      switch (booking.step) {
        case "START":
          if (Number(Body) >= 1 && Number(Body) <= 4) {
            await Book.findByIdAndUpdate(booking._id, {
              service: SERVICES[Number(Body) - 1],
              price: SERVICE_PRICES[Number(Body) - 1],
              step: "SERVICE",
            });
            result = DaySelection();
          } else {
            result = ServiceSelection();
          }
          break;
        case "SERVICE":
          if (Number(Body) >= 1 && Number(Body) <= 4) {
            const date = new Date();
            date.setDate(date.getDate() + (Number(Body) - 1));
            const dateToStr = `${date.getFullYear()}-${convertToTwoDigits(date.getMonth() + 1)}-${date.getDate()}`;
            const bookedAtData = {
              dayTimestamp: new Date(dateToStr).getTime()
            }
            await Book.findByIdAndUpdate(booking._id, {
              bookedAt: bookedAtData,
              step: "DAY"
            });
            result = "What time would you like to book? (24 hours format: 00:00)";
          } else {
            result = WrongMessage();
          }
          break;
        case "DAY":
          var regex = /([01]\d|2[0-3]):([0-5]\d)/;
          const match = regex.test(Body);
          if (match) {
            const hour = Body.split(':')[0];
            const min = Body.split(':')[1];
            const bookedAtData = {
              dayTimestamp: booking.bookedAt?.dayTimestamp,
              hourTimestamp: Number(hour) * 3600 * 1000 + Number(min) * 60 * 1000
            }
            await Book.findByIdAndUpdate(booking._id, {
              bookedAt: bookedAtData,
              step: "TIME"
            });
            result = "Who do you prefer? (Name)";
          } else {
            result = WrongMessage();
          }
          break;
        case "TIME":
          await Book.findByIdAndUpdate(booking._id, {
            person: Body,
            step: "PENDING"
          });
          result = "Thank you. You booked successfully.";
          break;
        case "PENDING":
          result = `Here are your booking detail.\nService: ${booking.service} ($${booking.price})\nBooked Date: ${new Date(Number(booking.bookedAt?.dayTimestamp) + Number(booking.bookedAt?.hourTimestamp)).toLocaleString()}\nName: ${booking.person}`
          break;
        default:
          break;
      }
    } else {
      result = ServiceSelection();
      const newBooking = new Book({
        phone: currentUser?.WaId,
        step: "START",
      });
      await newBooking.save();
    }

    const twimlResponse = new MessagingResponse();
    twimlResponse.message(result);
    return res.status(200).send(twimlResponse.toString());
  } catch (err) {
    console.log(err);
    return next(err);
  }
};
