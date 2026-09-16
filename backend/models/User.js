"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        isAdmin: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// =========================================================
// HASH PASSWORD
// =========================================================

userSchema.pre("save", async function () {

    // Password has not changed
    if (!this.isModified("password")) {
        return;
    }

    // Hash password
    this.password = await bcrypt.hash(
        this.password,
        10
    );
});

// =========================================================
// COMPARE PASSWORD
// =========================================================

userSchema.methods.comparePassword = function (candidatePassword) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );

};

// =========================================================
// EXPORT
// =========================================================

module.exports = mongoose.model(
    "User",
    userSchema
);