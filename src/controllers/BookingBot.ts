import { Request, Response, NextFunction } from "express";
import { Twilio } from "twilio";
import { SERVICES, MONTHS } from "../utils/constants";
import Book from "../models/Book";

const twilioClient = new Twilio(
  process.env.TWILIO_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

type IUser = {
  WaId: string;
  ProfileName: string;
};

let currentUser: IUser | null = null;

const ServiceSelection = () => {
  let str = `Hi, ${currentUser?.ProfileName}. What service would you like to book?\n`;

  SERVICES.forEach((service: string, index: number) => {
    str += `${index + 1} - ${service}\n`;
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
  const booking = await Book.findOne({ phone: currentUser?.WaId, step: { $ne: 'CANCEL'} }).sort({
    createdAt: 1, // 1 for ascending order, -1 for descending order
  });

  try {
    if (booking) {
      switch (booking.step) {
        case "START":
          if (Number(Body) >= 1 && Number(Body) <= 4) {
            await Book.findByIdAndUpdate(booking._id, {
              service: SERVICES[Number(Body) - 1],
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
            const bookedAtData = {
              year: date.getFullYear(),
              month: date.getMonth(),
              day: date.getDate()
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
              ...booking.bookedAt,
              hour: Number(hour),
              min: Number(min) 
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
          await Book.findByIdAndUpdate(booking._id, { person: Body, step: "PENDING", completed: true });
          result = "Thank you. You booked successfully.";
          break;
        case "PENDING":
          if(Body === 'y') {
            await Book.findByIdAndUpdate(booking._id, { step: "REBOOKING" });
            result = 'Which day you prefer? (e.g: 2024:01:01)';
          } else if (Body === 'n') {
            await Book.findByIdAndUpdate(booking._id, { step: "CANCEL" });
            result = ServiceSelection();
            const newBooking = new Book({
              phone: currentUser?.WaId,
              step: "START",
            });
            await newBooking.save();
          } else {
            const hour = Number(booking.bookedAt?.hour);
            const min = Number(booking.bookedAt?.min);
            const time = (hour > 12 ? `${hour - 12}` : hour)  + `:${convertToTwoDigits(min)}:00 ` + (hour >= 12 ? 'PM' : 'AM');
            result = `We suggest you\nService: ${booking.service}\nBooking Time: ${time}\nName: ${booking.person}\n\nAre you happy for this suggestion? (y/n)`
          }
          break;
        case "REBOOKING":
          var regex = /^\d{4}:\d{2}:\d{2}$/;
          let isCorect = regex.test(Body);
          if(isCorect) {
            const year = Body.split(':')[0];
            const month = Body.split(':')[1];
            const day = Body.split(':')[2];
            const bookedAtData = {
              ...booking.bookedAt,
              year: Number(year),
              month: Number(month),
              day: Number(day) 
            }
            await Book.findByIdAndUpdate(booking._id, { bookedAt: bookedAtData, step: 'PENDING' });
            result = `Thank you. You booked successfully on ${MONTHS[Number(month)].substring(0,3)} ${day}, ${year}.`;
          } else {
            result = WrongMessage();
          }
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

    twilioClient.messages
      .create({
         from: `whatsapp:${process.env.TWILIO_NUMBER}`,
         body: result,
         to: `whatsapp:+${currentUser?.WaId}`
       })
      .then(message => console.log(message.sid));
    return res.status(200);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

export const BookingData = async (req: Request, res: Response) => {
  try {
    const bookings = await Book.find({ completed: true }).sort({ createdAt: 1});
    return res.status(200).json({ bookings: bookings });
  } catch (err: any) {
    console.log(err);
  }
}
