// src/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { CustomError } = require("../utils/errors");

const authMiddleware = async (req, res, next) => {
    // Try cookie first, then fallback to Authorization header
    let token = req.cookies?.token; // 1- cookie token: attempts to retrieve the authentication token from the browser's cookies.

    if (!token) { // 2- header token: attempts to retrieve the authentication token from the "Authorization" header.
        const authHeader = req.header("Authorization"); // 3- header: The "Authorization" header is a standard HTTP header that is used to send authentication information to the server.
        if (authHeader && authHeader.startsWith("Bearer ")) { // 4-Bearer: The "Bearer" scheme is a type of authentication that is used to send authentication information to the server.
            token = authHeader.replace("Bearer ", "").trim(); // 5- replace: The "replace" method is a built-in JavaScript method that is used to replace a specified value with another value.
        }
    }

    if (!token) return next(new CustomError("Unauthorized", 401)); // 6- unauthorized: returns a 401 status code and an error message if the token is not found.

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // 7- verify: verifies the token using the JWT_SECRET environment variable.

        // Reject refresh tokens used as access tokens
        if (decoded.type && decoded.type !== "access") { // 8- reject refresh tokens: rejects refresh tokens used as access tokens.
            return next(new CustomError("Invalid token type", 401)); // 9- invalid token type: returns a 401 status code and an error message if the token type is invalid.
        }

        // Fetch the full user from DB so req.user always has organizationId and
        // any other fields that are not stored in the JWT payload.
        const user = await User.findById(decoded.id).select("-password"); // 10- fetch user: fetches the full user from the database. What does decoded.id means here? its the id of the user who logged in
        if (!user) return next(new CustomError("User not found", 401)); // 11- user not found: returns a 401 status code and an error message if the user is not found.

        // New: blok deactivated accounts even if they have a valid token
        if (user.isDeactivated) {
            return next(new CustomError("Your account has been deactivated. Contact your admin.", 403)); // 12- deactivated account: returns a 403 status code and an error message if the account is deactivated.
        }

        // Set the user in the request
        req.user = {
            id: user._id.toString(), // 13- user id: id of the user who logged in
            role: user.role, // 14- user role: role of the user who logged in
            organizationId: user.organizationId ?? null, // 15- organization id: organization id of the user who logged in
            name: user.name, // 16- user name: name of the user who logged in
            email: user.email, // 17- user email: email of the user who logged in
        };
        next();
    } catch (error) {
        next(new CustomError("Invalid token", 401));
    }
};

module.exports = authMiddleware;