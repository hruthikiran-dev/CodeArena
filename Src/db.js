// mongoose is the tool that lets Node.js talk to MongoDB
const mongoose = require("mongoose");

// This function connects to our MongoDB Atlas database
// We make it a function so we can call it once when the server starts
async function connectDB() {
  try {
    // process.env.MONGO_URI reads the value from your .env file
    // We never hardcode the password directly in code — that's a security risk
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB!");

  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
    process.exit(1); // if DB fails to connect, stop the server entirely
                     // there's no point running without a database
  }
}

// Export so server.js can call this on startup
module.exports = { connectDB };