const Joi = require("joi");

const userSchema = Joi.object({
    address: Joi.string().min(5).required().messages({
        "string.base": "Address must be a string",
        "string.min": "Address must be at least 5 characters",
        "any.required": "Address is required",
    }),
    username: Joi.string().alphanum().min(3).max(30).required().messages({
        "string.base": "Username must be a string",
        "string.alphanum": "Username must contain only alphanumeric characters",
        "string.min": "Username must be at least 3 characters",
        "string.max": "Username cannot exceed 30 characters",
        "any.required": "Username is required",
    }),
});

module.exports = userSchema;
