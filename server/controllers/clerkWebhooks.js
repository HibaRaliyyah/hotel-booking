import { Webhook } from "svix";
import User from "../models/User.js";

const clerkWebhooks = async (req, res) => {
  try {
    // 1️⃣ Check if webhook secret exists
    if (!process.env.CLERK_WEBHOOK_SECRET) {
      throw new Error("CLERK_WEBHOOK_SECRET is not set");
    }

    // 2️⃣ Get raw body (important for verification)
    const payload = req.body; // must be raw body (Buffer or string)

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    // 3️⃣ Verify webhook signature
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = whook.verify(payload, headers);

    const { data, type } = evt;

    // 4️⃣ Handle user create & update
    if (type === "user.created" || type === "user.updated") {
      const userData = {
        _id: data.id,
        email: data.email_addresses?.[0]?.email_address || "",
        username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        image: data.image_url || "",
      };

      await User.findByIdAndUpdate(
        data.id,
        userData,
        { upsert: true, new: true }
      );
    }

    // 5️⃣ Handle user delete
    if (type === "user.deleted") {
      await User.findByIdAndDelete(data.id);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Clerk Webhook Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export default clerkWebhooks;
