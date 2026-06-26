import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import clerkWebhooks from "./controllers/clerkWebhooks.js";
import userRouter from "./routes/userRoutes.js";
import hotelRouter from "./routes/hotelRoutes.js";
import connectCloudinary from "./config/cloudinary.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";

// ===============================
// CONNECT DATABASE & CLOUDINARY
// ===============================
connectDB();
connectCloudinary();

const app = express();

// ===============================
// CORS CONFIG (PRODUCTION SAFE)
// ===============================
const allowedOrigins = [
  "http://localhost:5173", // Local Vite dev
  "https://staymatrix.vercel.app", // Production frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ===============================
// API to listen to Stripe Webhooks
// ===============================
app.post('/api/stripe', express.raw({type: "application/json"}), stripeWebhooks);

// ===============================
// CLERK WEBHOOK (MUST BE BEFORE express.json())
// ===============================
app.post(
  "/api/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhooks
);

// ===============================
// NORMAL MIDDLEWARES
// ===============================
app.use(express.json());
app.use(clerkMiddleware());

// ===============================
// ROUTES
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 StayMatrix API is working");
});

app.use("/api/user", userRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/bookings", bookingRouter);

// ===============================
// 404 HANDLER
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
