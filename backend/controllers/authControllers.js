"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");


// =========================================================
// GENERATE JWT TOKEN
// =========================================================

const generateToken = (userId) => {

    return jwt.sign(
        {
            id: userId
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

};


// =========================================================
// REGISTER USER
// =========================================================

const registerUser = async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });

        }


        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });

        }


        // -------------------------------------------------
        // CHECK EXISTING USER
        // -------------------------------------------------

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });


        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "User with this email already exists."
            });

        }


        // -------------------------------------------------
        // CREATE USER
        // -------------------------------------------------

        const user = await User.create({

            name: name.trim(),

            email: email.toLowerCase().trim(),

            password: password

        });


        // -------------------------------------------------
        // GENERATE TOKEN
        // -------------------------------------------------

        const token = generateToken(user._id);


        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        return res.status(201).json({

            success: true,

            message: "Registration successful.",

            token: token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }

        });


    } catch (error) {

        console.error(
            "❌ Register User Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to register user.",

            error: error.message

        });

    }

};


// =========================================================
// LOGIN USER
// =========================================================

const loginUser = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and password are required."

            });

        }


        // -------------------------------------------------
        // FIND USER
        // -------------------------------------------------

        const user = await User.findOne({

            email: email.toLowerCase().trim()

        });


        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        // -------------------------------------------------
        // CHECK PASSWORD
        // -------------------------------------------------

        const passwordMatch =
            await user.comparePassword(password);


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        // -------------------------------------------------
        // GENERATE TOKEN
        // -------------------------------------------------

        const token =
            generateToken(user._id);


        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        return res.status(200).json({

            success: true,

            message: "Login successful.",

            token: token,

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                isAdmin: user.isAdmin

            }

        });


    } catch (error) {

        console.error(
            "❌ Login User Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to login.",

            error: error.message

        });

    }

};


// =========================================================
// GET CURRENT USER
// =========================================================

const getMe = async (req, res) => {

    try {

        const user = await User.findById(
            req.user._id
        ).select("-password");


        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        return res.status(200).json({

            success: true,

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                isAdmin: user.isAdmin

            }

        });


    } catch (error) {

        console.error(
            "❌ Get Me Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to get user."

        });

    }

};


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    registerUser,

    loginUser,

    getMe

};