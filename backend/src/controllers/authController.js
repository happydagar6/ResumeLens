// src/controllers/authController.js

const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { response } = require('../utils/response');
const { CustomError } = require('../utils/errors');
const { z } = require('zod');
const crypto = require('crypto');
const Organization = require('../models/organizationModel');
const sendEmail = require('../services/emailService');

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    company: z.string().optional(),
    role: z.enum(["recruiter", "hiring_manager", "admin"]).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

function generateAccessToken(userId, role) {
    return jwt.sign({ id: userId, role, type: "access" }, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });
}

function generateRefreshToken(userId) {
    return jwt.sign({ id: userId, type: "refresh" }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
}

// Sets BOTH cookies in a single helper call.
// - "token" → accessToken (15 min)
// - "refreshToken" → refreshToken (30 days)
function setAuthCookies(res, userId, role) {
    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/api/auth", // only sent to auth endpoints
    });
}

async function signup(req, res, next) {
    try {
        const { name, email, password, company, role } = signupSchema.parse(req.body);
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new CustomError("User already exists", 409);

        const user = new User({ name, email, password, company, role });
        await user.save();

        if (role === "recruiter" || !role) {
            // Recruiter creates a new org
            const slug = company
            ? company.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()
            : "org-" + Date.now();

            const org = new Organization({
                name: company || "My Organization",
                slug,
                createdBy: user._id,
                inviteCode: crypto.randomBytes(16).toString("hex"),
            });
            await org.save();
            user.organizationId = org._id;
            await user.save();
        } else if (role === "hiring_manager") {
            // HM joins via invite code
            const { inviteCode } = req.body;
            if (!inviteCode) throw new CustomError("Invite code is required for hiring managers", 400);
            const org = await Organization.findOne({ inviteCode });
            if (!org) throw new CustomError("Invalid invite code", 400);
            user.organizationId = org._id;
            await user.save();
        } else if (role === "admin") {
            // Admin: create their own org just like recruiters
            const slug = company
                ? company.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()
                : "org-" + Date.now();
            const org = new Organization({
                name: company || "My Organization",
                slug,
                createdBy: user._id,
                inviteCode: crypto.randomBytes(16).toString("hex"),
            });
            await org.save();
            user.organizationId = org._id;
            await user.save();
        }


        setAuthCookies(res, user._id, user.role);

        response(res, 201, { user: { id: user._id, name, email, company, role: user.role } }, "User created successfully");
    } catch (err) {
        next(err);
    }
}


// GET /auth/invite-code
// Returns the org's invite code — only recruiter/admin of that org can see it

async function getInviteCode(req, res, next) {
    try {
        let org = await Organization.findById(req.user.organizationId);

        // Auto-create an org for users who signed up before the org system was added
        if (!org) {
            const dbUser = await User.findById(req.user.id);
            if (!dbUser) throw new CustomError("User not found", 404);

            const company = dbUser.company || "My Organization";
            const slug = company.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
            org = new Organization({
                name: company,
                slug,
                createdBy: dbUser._id,
                inviteCode: crypto.randomBytes(16).toString("hex"),
            });
            await org.save();
            dbUser.organizationId = org._id;
            await dbUser.save();
        }

        if (org.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
            throw new CustomError("Only the org owner can view the invite code", 403);
        }
        response(res, 200, { inviteCode: org.inviteCode, orgName: org.name });
    } catch (error) {
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            throw new CustomError("Invalid credentials", 401);
        }

        setAuthCookies(res, user._id, user.role);

        response(res, 200, { user: { id: user._id, name: user.name, email: user.email, company: user.company, role: user.role } }, "Logged in successfully");
    } catch (err) {
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/api/auth",
        });
        response(res, 200, null, "Logged out successfully");
    } catch (err) {
        next(err);
    }
}

async function me(req, res, next) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) throw new CustomError("User not found", 404);
        response(res, 200, { user: { id: user._id, name: user.name, email: user.email, company: user.company, role: user.role } });
    } catch (err) {
        next(err);
    }
}

async function updateProfile(req, res, next) {
    try {
        const updateSchema = z.object({
            name: z.string().min(2).optional(),
            company: z.string().optional(),
        });
        const data = updateSchema.parse(req.body);

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: data },
            { returnDocument: "after", runValidators: true }
        );
        if (!user) throw new CustomError("User not found", 404);
        response(res, 200, { user: { id: user._id, name: user.name, email: user.email, company: user.company, role: user.role } });
    } catch (error) {
        next(error);
    }
}

async function updatePassword(req, res, next) {
    try {
        const passwordSchema = z.object({
            currentPassword: z.string().min(6),
            newPassword: z.string().min(6),
            newPassword: z.string().min(6, "New password must be at least 6 characters"),
        });
        const { currentPassword, newPassword } = passwordSchema.parse(req.body); // Validate input

        const user = await User.findById(req.user.id).select("+password");
        if(!user) throw new CustomError("User not found", 404);

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) throw new CustomError("Current password is incorrect", 401);

        user.password = newPassword;
        await user.save();

        response(res, 200, null, "Password updated successfully");
    } catch (error) {
        next(error);
    }
}

// GET /api/auth/team
// Returns all users in the same organization as the requester.
async function getTeamMembers(req, res, next) {
    try {
        if (!req.user.organizationId) {
            return response(res, 200, { members: [] });
        }
        const members = await User.find(
            { organizationId: req.user.organizationId },
            "name email role createdAt"
        ).sort({ createdAt: 1 });
        response(res, 200, { members });
    } catch (error) {
        next(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// No body required. Reads the refreshToken HttpOnly cookie, verifies it,
// issues a fresh accessToken cookie.
// This endpoint does NOT require authMiddleware (the accessToken is expired).
// ─────────────────────────────────────────────────────────────────────────────
async function refreshAccessToken(req, res, next) {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new CustomError("No refresh token provided", 401);
        }

        // Verify the refresh token
        let decoded;
        try {
            decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
            );
        } catch (err) {
            throw new CustomError("Invalid or expired refresh token — please log in again", 401);
        }

        // Safety: ensure this is actually a refresh token, not an access token
        if (decoded.type !== "refresh") {
            throw new CustomError("Invalid token type", 401);
        }

        // Fetch the user to get their current role (role could have changed since token was issued)
        const user = await User.findById(decoded.id).select("role isDeactivated");
        if (!user) throw new CustomError("User not found", 401);

        // Block deactivated users from refreshing
        if (user.isDeactivated) {
            throw new CustomError("Your account has been deactivated. Contact your admin.", 403);
        }

        // Issue only a new accessToken — do NOT re-issue the refresh token
        const newAccessToken = generateAccessToken(decoded.id, user.role);

        res.cookie("token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        response(res, 200, null, "Token refreshed successfully");
    } catch (err) {
        next(err);
    }
}


async function forgotPassword(req, res, next) {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            throw new CustomError("There is no user with that email", 404);
        }

        // Generate token and save to DB
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // Create the frontend URL with the token attached
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const message = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Recruit AI account.</p>
            <p>Click the link below to reset your password. This link is valid for 15 minutes.</p>
            <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: "Recruit AI - Password Reset Token",
                html: message,
            });

            response(res, 200, null, "Email sent successfully");
        } catch (err) {
            // If email fails, wipe the token from DB so they can try again
            user.resetPasswordToken = undefined; // Undefined is used to remove the field from the database
            user.resetPasswordExpire = undefined; // Undefined is used to remove the field from the database
            await user.save({ validateBeforeSave: false }); // validateBeforeSave: false prevents the pre('save') hook from running, avoiding the password hashing

            throw new CustomError("Email could not be sent", 500); // Throw error with message
        }
    } catch (error) {
        next(error); // Pass the error to the next middleware
    }
}

async function resetPassword(req, res, next) {
    try {
        const { token, password } = req.body; // Get token and password from request body
        
        if (!token || !password) { // Check if token and password are provided
            throw new CustomError("Please provide a token and a new password", 400);
        }

        // Hash the incoming token to compare it to the one saved in the database
        const resetPasswordToken = crypto
            .createHash("sha256") // Create a SHA256 hash object
            .update(token) // Update the hash with the token
            .digest("hex"); // Convert to hexadecimal

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }, // Ensure token hasn't expired
        }); // Find user with the given token and check if it's expired

        if (!user) {
            throw new CustomError("Invalid or expired token", 400); // Throw error if token is invalid or expired
        }

        // Set the new password and clear the tokens
        user.password = password;
        user.resetPasswordToken = undefined; // Undefined is used to remove the field from the database
        user.resetPasswordExpire = undefined; // Undefined is used to remove the field from the database
        await user.save(); // This triggers the pre('save') hook to hash the new password

        // Log the user in automatically after reset
        setAuthCookies(res, user._id, user.role); // Set authentication cookies for the user

        response(res, 200, {
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        }, "Password reset successful"); // Send success response with user data
    } catch (err) {
        next(err);
    }
}

module.exports = { signup, login, logout, me, updateProfile, updatePassword, getInviteCode, getTeamMembers, refreshAccessToken, forgotPassword, resetPassword };