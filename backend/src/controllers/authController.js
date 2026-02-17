// src/controllers/authController.js

const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { response } = require('../utils/response');
const { CustomError } = require('../utils/errors');
const { z } = require('zod');

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

function generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
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

        const token = generateToken(user._id);
        setTokenCookie(res, token);

        response(res, 201, { user: { id: user._id, name, email, company, role: user.role } }, "User created successfully");
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            throw new CustomError("Invalid credentials", 401);
        }

        const token = generateToken(user._id);
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

module.exports = { signup, login, logout, me };