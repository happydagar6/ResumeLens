// src/controllers/authController.js

const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { response } = require('../utils/response');
const { CustomError } = require('../utils/errors');
const { z } = require('zod');

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function signup(req, res, next) {
  try {
    const { email, password, name, company, role } = authSchema.parse(req.body);
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new CustomError('User exists', 409);

    const user = new User({ email, password, name, company, role });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    response(res, 201, { user: { id: user._id, email } }, 'User created');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = authSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) throw new CustomError('Invalid credentials', 401);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    response(res, 200, { user: { id: user._id, email } }, 'Logged in');
  } catch (err) {
    next(err);
  }
}

// Add logout (clear cookie), me (get user)
module.exports = { signup, login /* ... */ };