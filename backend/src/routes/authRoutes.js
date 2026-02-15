// src/routes/authRoutes.js
const express = require('express');
const { signup, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
// Add others

module.exports = router;