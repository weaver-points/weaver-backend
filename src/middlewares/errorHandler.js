const errorHandler = (err, req, res, next) => {
    // Log the error stack trace for debugging
    console.error("Error:", err.stack);

    // Determine the status code (default to 500 if not provided)
    const statusCode = err.statusCode ?? 500;

    // Prepare the response object
    const errorResponse = {
        success: false,
        message: err.message ?? "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }) // Include stack trace only in development mode
    };

    // Send JSON response with appropriate status code
    res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;


