const Joi = require("joi");

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.details.map((err) => err.message),
            });
        }
        next();  
    };
};

module.exports = validate;

/*

In the validate.js file, the Joi variable is not used directly because the schema
 is passed as an argument to the validate function. 
 The actual Joi usage happens outside this file when you define schemas.

*/