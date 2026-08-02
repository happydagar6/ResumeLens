// backend/src/services/sseService.js
//
// SSE Hub: manages all active browser connections.
// Any part of the backend (like BullMQ worker) can call broadcastToUser()
// to push a real-time event to a specific user's browser tab.

// Map<userId (string) → Set<Express Response objects>>
// Each user can have multiple tabs open, so we store a Set of connections.
const clients = new Map();

function addClient(userId, res) {
    if (!clients.has(userId)) {
        clients.set(userId, new Set()); 
    }
    clients.get(userId).add(res);
    console.log(`[SSE] Client connected — userId: ${userId}. Total connections: ${getTotalClientCount()}`);
}

// Remove the connection when the browser closes or navigates away
function removeClient(userId, res) {
    const userConnections = clients.get(userId);
    if (userConnections) {
        userConnections.delete(res);
        if (userConnections.size === 0) {
            clients.delete(userId); // Clean up empty set
        }
    }
    console.log(`[SSE] Client disconnected — userId: ${userId}. Total connections: ${getTotalClientCount()}`);
}



// Push a real-time event to ALL open tabs/windows of a specific user.
function broadcastToUser(userId, eventName, payload) {
    const userConnections = clients.get(userId?.toString());
    if (!userConnections || userConnections.size === 0) {
        // User is not connected right now — that's fine, just skip
        return;
    }

    // SSE format requires each message to look like:
    //   event: screening_complete\n
    //   data: {"resumeId":"...","score":87}\n\n
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const res of userConnections) {
        try {
            res.write(message);
        } catch (err) {
            // Connection was closed unexpectedly — remove it
            userConnections.delete(res);
        }
    }
}

// Get the total number of active connections
function getTotalClientCount() {
    let total = 0;
    for (const set of clients.values()) total += set.size;
    return total;
}

module.exports = { addClient, removeClient, broadcastToUser };
