const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/Admin");

mongoose.connect(process.env.MONGO_URI)
.then(async () => {

    const username = "admin";
    const password = "admin123";   // Change this later

    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await Admin.findOne({ username });

    if (existing) {
        console.log("Admin already exists");
        process.exit();
    }

    await Admin.create({
        username,
        password: hashedPassword
    });

    console.log("✅ Admin Created");

    process.exit();
})
.catch(err => console.log(err));