// src/config/database.js

const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err.message);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected. Attempting to reconnect...");
        });

    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = { connectDB };
