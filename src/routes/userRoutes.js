const express = require("express");
const router = express.Router();
const User = require("../models/User");
const validate = require('../middlewares/validate');
const userSchema = require('../validations/userValidation');

router.post("/register", validate(userSchema), async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        next(error);  
    }
});

router.get("/users", async (req, res, next) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
