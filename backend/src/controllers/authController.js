// src/controllers/authController.js

const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { response } = require('../utils/response');
const { CustomError } = require('../utils/errors');
const { z } = require('zod');
const crypto = require('crypto');
const Organization = require('../models/organizationModel');

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

function generateToken(userId, role) {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || "7d",
    });
}

function setTokenCookie(res, token) {
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
        } else {
            throw new CustomError("Invalid role", 400);
        };


        const token = generateToken(user._id, user.role);
        setTokenCookie(res, token);

        response(res, 201, { user: { id: user._id, name, email, company, role: user.role } }, "User created successfully");
    } catch (err) {
        next(err);
    }
}


// GET /auth/invite-code
// Returns the org's invite code — only recruiter/admin of that org can see it

async function getInviteCode(req, res, next) {
    try {
        const org = await Organization.findById(req.user.organizationId);
        if (!org) throw new CustomError("Organization not found", 404);
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

        const token = generateToken(user._id, user.role);
        setTokenCookie(res, token);

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
            { new: true, runValidators: true }
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

module.exports = { signup, login, logout, me, updateProfile, updatePassword, getInviteCode };