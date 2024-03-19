import React from "react";
import { Row, Table } from "antd";
import axios from "axios";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const convertToTwoDigits = (num) => {
  return num < 10 ? '0' + num : num;
}

function App() {
  const [bookingData, setBookingData] = React.useState([]);

  const columns = [
    {
      title: 'Phone number',
      dataIndex: 'phone',
      key: 'phone',
    }, 
    {
      title: "Service Name",
      dataIndex: "service",
      key: "service",
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (text) => <span>${text}</span>,
    },
    {
      title: 'Booking Date',
      dataIndex: "bookedAt",
      key: "bookedAt",
      render: (_, { bookedAt }) => (
        <span>{MONTHS[bookedAt.month].substring(0, 3)} {bookedAt.day}, {bookedAt.year} {(bookedAt.hour > 12 ? `${bookedAt.hour - 12}` : bookedAt.hour)  + `:${convertToTwoDigits(bookedAt.min)}:00 ` + (bookedAt.hour >= 12 ? 'PM' : 'AM')}</span> 
      )
    },
    {
      title: 'Name',
      dataIndex: 'person',
      key: 'person'
    }
  ];

  React.useEffect(() => {
    axios.get(`${process.env.REACT_APP_SERVER_URL}/api/book`)
      .then((response) => {
        const { data } = response;
        setBookingData(
          data.bookings.map((booking) => {
          const data = {
            ...booking, 
            key: booking._id
          }
          return data;
        }));
      }).catch((err) => console.log(err));

  }, [])

  return (
    <Row
      style={{
        width: "100%",
        padding: 50,
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          width: '100%'
        }}
      >
        Booking Data
      </h1>
      <Table
        style={{
          width: "100%",
        }}
        columns={columns}
        dataSource={bookingData}
      />
    </Row>
  );
}

export default App;
