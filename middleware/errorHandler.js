// Centralized error handling — always returns JSON, never stack traces in production.
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== 'production') {
    console.error('[api-error]', err);
  }
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong on our side. Please try again.' : err.message,
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFound, errorHandler, asyncHandler };
