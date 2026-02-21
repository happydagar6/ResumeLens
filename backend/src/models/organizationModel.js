const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inviteCode: { type: String, required: true, unique: true }, // secret token for joining
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);