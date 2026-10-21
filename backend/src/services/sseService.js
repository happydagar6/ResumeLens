// backend/src/services/sseService.js
//
// SSE Hub: manages active real-time browser connections.
// Pushes events (e.g. BullMQ screening completed) to recruiters in real time.

// Map<userId (string) → Set<Express Response objects>>
const clients = new Map();

// ── Resource Guard: Maximum simultaneous SSE streams allowed per user ────────
// Allows up to 3 open tabs per recruiter while preventing socket exhaustion attacks.
const MAX_CONNECTIONS_PER_USER = 3;

/**
 * Registers an incoming SSE client connection.
 * If the user exceeds the maximum allowed tabs, the oldest connection is gracefully closed.
 */
function addClient(userId, res) {
    const key = userId?.toString();
    if (!clients.has(key)) {
        clients.set(key, new Set()); 
    }
    const userConnections = clients.get(key);

    // ── SECURITY & RESOURCE DEFENSE: Cap Concurrent SSE Sockets (SEC-04) ──────
    // If user already has 3 open streams, evict the oldest one (FIFO)
    if (userConnections.size >= MAX_CONNECTIONS_PER_USER) {
        // In a JavaScript Set, iteration order matches insertion order.
        // The first value is always the oldest opened connection.
        const oldestRes = userConnections.values().next().value;
        if (oldestRes) {
            try {
                // Notify the browser before closing so it knows why it was disconnected
                oldestRes.write(`event: session_superseded\ndata: ${JSON.stringify({ message: "Connection closed because another browser tab was opened." })}\n\n`);
                oldestRes.end(); // Gracefully closes the HTTP TCP stream
            } catch (err) {
                // Socket was already dead — ignore write error
            }
            userConnections.delete(oldestRes);
            console.log(`[SSE] User ${key} reached connection limit (${MAX_CONNECTIONS_PER_USER}). Closed oldest connection.`);
        }
    }

    userConnections.add(res);
    console.log(`[SSE] Client connected — userId: ${key}. User tabs: ${userConnections.size}/${MAX_CONNECTIONS_PER_USER}. Total active sockets: ${getTotalClientCount()}`);
}

/**
 * Cleanly removes a client socket when the browser tab closes or navigates away.
 */
function removeClient(userId, res) {
    const key = userId?.toString();
    const userConnections = clients.get(key);
    if (userConnections) {
        userConnections.delete(res);
        if (userConnections.size === 0) {
            clients.delete(key); // Free the Set when no tabs remain
        }
    }
    console.log(`[SSE] Client disconnected — userId: ${key}. Total active sockets: ${getTotalClientCount()}`);
}

/**
 * Pushes a real-time event to all active tabs of a specific user.
 */
function broadcastToUser(userId, eventName, payload) {
    const key = userId?.toString();
    const userConnections = clients.get(key);
    if (!userConnections || userConnections.size === 0) {
        // User has no tabs open right now — safely skip
        return;
    }

    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const res of userConnections) {
        try {
            res.write(message);
        } catch (err) {
            // Connection dropped unexpectedly — clean it up
            userConnections.delete(res);
        }
    }
}

/**
 * Helper to calculate total active SSE connections across all users.
 */
function getTotalClientCount() {
    let total = 0;
    for (const set of clients.values()) total += set.size;
    return total;
}

module.exports = { addClient, removeClient, broadcastToUser };