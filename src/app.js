// src/app.js
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middleware
app.use(express.json());

app.use(errorHandler);  

// Database connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Could not connect to MongoDB:", err));

// Basic test route
app.get("/", (req, res) => {
    res.send("Weaver API is running");
});

const userRoutes = require("./routes/userRoutes");
app.use("/api", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
