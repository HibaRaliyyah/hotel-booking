import transporter from "../config/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";


// ================= CHECK ROOM AVAILABILITY FUNCTION =================
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lt: new Date(checkOutDate) },
      checkOutDate: { $gt: new Date(checkInDate) },
    });

    return bookings.length === 0;
  } catch (error) {
    console.error("Availability Error:", error.message);
    return false;
  }
};


// ================= API: CHECK AVAILABILITY =================
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, room } = req.body;

    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });

    res.json({ success: true, isAvailable });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// ================= API: CREATE BOOKING =================
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, room, guests, paymentMethod } =
      req.body;

    const user = req.user._id;

    // Check availability
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });

    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Room is not available",
      });
    }

    // Get room data
    const roomData = await Room.findById(room).populate("hotel");

    if (!roomData) {
      return res.json({
        success: false,
        message: "Room not found",
      });
    }

    // Calculate nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (nights <= 0) {
      return res.json({
        success: false,
        message: "Invalid date selection",
      });
    }

    const totalPrice = roomData.pricePerNight * nights;

    // Create booking
    const newBooking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: Number(guests),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalPrice,
      paymentMethod,
    });

    // Send confirmation email
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: req.user.email,
        subject: "Hotel Booking Confirmation",
        html: `
          <h2>Booking Confirmation</h2>
          <p>Dear ${req.user.username},</p>
          <p>Your booking has been successfully confirmed.</p>
          <ul>
            <li><strong>Booking ID:</strong> ${newBooking._id}</li>
            <li><strong>Hotel:</strong> ${roomData.hotel.name}</li>
            <li><strong>Location:</strong> ${roomData.hotel.address}</li>
            <li><strong>Check-In:</strong> ${checkIn.toDateString()}</li>
            <li><strong>Check-Out:</strong> ${checkOut.toDateString()}</li>
            <li><strong>Total Amount:</strong> ${process.env.CURRENCY || "$"
          } ${totalPrice}</li>
          </ul>
          <p>We look forward to welcoming you!</p>
          <p>If you need to make any changes, feel free to contact us.</p>
        `,
      };

      transporter.sendMail(mailOptions).catch((emailError) => {
        console.log("Email Error:", emailError.message);
      });

    res.json({
      success: true,
      message: "Booking created successfully",
      booking: newBooking,
    });

  } catch (error) {
    console.log("Create Booking Error:", error);
    res.json({
      success: false,
      message: "Failed to create booking",
    });
  }
};


// ================= API: USER BOOKINGS =================
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;

    const bookings = await Booking.find({ user })
      .populate("room hotel")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });

  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};


// ================= API: HOTEL DASHBOARD BOOKINGS =================
// GET /api/bookings/hotel
export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user._id });

    if (!hotel) {
      return res.json({
        success: false,
        message: "No hotel found",
      });
    }

    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });

    const totalBookings = bookings.length;

    const totalRevenue = bookings.reduce(
      (acc, booking) => acc + booking.totalPrice,
      0
    );

    res.json({
      success: true,
      dashboardData: {
        totalBookings,
        totalRevenue,
        bookings,
      },
    });

  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};


export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const roomData = await Room.findById(booking.room).populate('hotel');
    const totalPrice = booking.totalPrice;
    const { origin } = req.headers;
    
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = [
      {
        price_data:{
          currency: "usd",
          product_data:{
            name: roomData.hotel.name,
          },
          unit_amount: totalPrice * 100
        },
        quantity: 1,
      }
    ]
    // Create Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata:{
        bookingId,
      }
    })
    res.json({success:true, url: session.url})
  } catch (error) {
    res.json({success:false, message:"Payment Failed"})
  }
}