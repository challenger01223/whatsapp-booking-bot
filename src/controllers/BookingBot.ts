import { Request, Response, NextFunction } from "express";
import { twiml } from "twilio";
import { SERVICES, MONTHS } from "../utils/constants";
const { MessagingResponse } = twiml;

type IUser = {
  WaId: string;
  ProfileName: string;
};

type IBotStep = {
  user: IUser;
  step: string | null;
  bookingInfo: Array<string>;
};

let state: Array<IBotStep> = [];
let currentUser: IUser | null = null;

const ServiceSelection = () => {
  let str = `
        Hi, ${currentUser?.ProfileName}. What service would you like to book?

        --- Services ---`;

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

const DaySelection = () => {
  const date = new Date();
  const secondDate = new Date();
  const thirdDate = new Date();
  const fourthDate = new Date();
  secondDate.setDate(date.getDate() + 1);
  thirdDate.setDate(date.getDate() + 2);
  fourthDate.setDate(date.getDate() + 3);
  return `
        When would you like to book?
        1 - ${getDayFormat(date)} (today)
        2 - ${getDayFormat(secondDate)}
        3 - ${getDayFormat(thirdDate)}
        4 - ${getDayFormat(fourthDate)}
    `;
};

const WrongMessage = () => {
  return "Wrong message.";
};

export const Booking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(state, currentUser);
  const { Body, WaId, ProfileName } = req.body;
  currentUser = { WaId, ProfileName };
  let result: any = null;

  try {
    const foundIndex = state.findIndex(
      (e: IBotStep) => e.user.WaId === currentUser?.WaId
    );

    if (foundIndex !== -1) {
      const currentBot: IBotStep = state[foundIndex];
      switch (currentBot.step) {
        case "SERVICE":
          if (Number(Body) >= 1 && Number(Body) <= 4) {
            state[foundIndex].bookingInfo.push(String(Number(Body) - 1));
            state[foundIndex].step = "DAY";
            result = DaySelection();
          } else {
            result = WrongMessage();
          }
          break;
        case "DAY":
          if (Number(Body) >= 1 && Number(Body) <= 4) {
            state[foundIndex].bookingInfo.push(String(Number(Body) - 1));
            state[foundIndex].step = "TIME";
            result =
              "What time would you like to book? (24 hours format: 00:00)";
          } else {
            result = WrongMessage();
          }
          break;
        case "TIME":
          var regex = /([01]\d|2[0-3]):([0-5]\d)/;
          const match = regex.test(Body);
          if (match) {
            state[foundIndex].bookingInfo.push(Body);
            state[foundIndex].step = "PERSON";
            result = "Who do you prefer? (Name)";
          } else {
            result = WrongMessage();
          }
          break;
        case "PERSON":
          state[foundIndex].bookingInfo.push(Body);
          state[foundIndex].step = null;
          result = "Thank you. You booked successfully.";
          break;
        default:
          break;
      }
    } else {
      result = ServiceSelection();
      state.push({
        step: "SERVICE",
        user: currentUser,
        bookingInfo: [],
      });
    }

    const twimlResponse = new MessagingResponse();
    twimlResponse.message(result);
    return res.status(200).send(twimlResponse.toString());
  } catch (err) {
    console.log(err);
    return next(err);
  }
};
