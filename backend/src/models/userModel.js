// src/models/userModel.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false, // Don't return password by default
        },
        company: {
            type: String,
            trim: true,
            default: "",
        },
        role: {
            type: String,
            enum: ["recruiter", "hiring_manager", "admin"],
            default: "recruiter",
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        isDeactivated: {
            type: Boolean,
            default: false,
        },
        activityClearedAt: {
            type: Date,
            default: null,
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
    // Generate secure random token
    const resetToken = crypto.randomBytes(20).toString("hex"); // 20 bytes = 160 bits = 40 hex characters

    // Hash token and save it to the database field
    this.resetPasswordToken = crypto
        .createHash("sha256") // SHA256 is a cryptographic hash function that produces a 256-bit (32-byte) hash value
        .update(resetToken) // update the hash with the token
        .digest("hex"); // convert to hexadecimal

    // Set expiration to 15 minutes from now
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken; // We return the UNHASHED token to send via email
};

module.exports = mongoose.model("User", userSchema);