import { Webhook } from "svix";
import User from "../models/User.js";

const clerkWebhooks = async (req, res) => {
  try {
    console.log("🔥 Clerk webhook received");

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const payload = whook.verify(req.body, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = payload;

    console.log("📩 Event type:", type);
    console.log("👤 User ID:", data.id);

    const userData = {
      _id: data.id,
      email: data.email_addresses?.[0]?.email_address || "",
      username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      image: data.image_url || "",
    };

    if (type === "user.created" || type === "user.updated") {
      await User.findByIdAndUpdate(
        data.id,
        userData,
        { upsert: true, new: true }
      );
      console.log("✅ User saved/updated in MongoDB");
    }

    if (type === "user.deleted") {
      await User.findByIdAndDelete(data.id);
      console.log("🗑️ User deleted from MongoDB");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.status(400).json({ success: false });
  }
};

export default clerkWebhooks;
