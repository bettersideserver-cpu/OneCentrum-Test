const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const router = express.Router();

/* ===========================
        REGISTER
=========================== */

router.post("/register", async (req, res) => {

    try {

        console.log("Register Request:", req.body);

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const existing = await Admin.findOne({
            email: email.toLowerCase()
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await admin.save();

        res.status(201).json({
            success: true,
            message: "Registration Successful"
        });

    } catch (err) {

        console.error("REGISTER ERROR");
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


/* ===========================
          LOGIN
=========================== */

router.post("/login", async (req, res) => {

    try {

        console.log("Login Request:", req.body);

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required."
            });
        }

        const admin = await Admin.findOne({
            email: email.toLowerCase()
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        const token = jwt.sign(
            {
                id: admin._id,
                name: admin.name,
                email: admin.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email
            }
        });

    } catch (err) {

        console.error("LOGIN ERROR");
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;