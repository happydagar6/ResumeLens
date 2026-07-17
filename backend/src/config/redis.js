// src/config/redis.js
const { Redis } = require("ioredis");

function createRedisConnection() {
    const url = process.env.REDIS_URL;
    if (!url) {
        console.warn("⚠️ REDIS_URL is not set in .env! Background jobs will fail.");
    }

    const connection = new Redis(url, {
        maxRetriesPerRequest: null, // REQUIRED by BullMQ
        enableReadyCheck: false,    // REQUIRED by BullMQ
    });

    connection.on("connect", () => console.log("✅ Redis connected via Cloud"));
    connection.on("error", (err) => console.error("❌ Redis error:", err.message));

    return connection;
}

module.exports = { createRedisConnection };
