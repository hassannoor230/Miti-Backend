const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    success: false,
    message: 'Please check the highlighted fields and try again.',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

module.exports = { handleValidation };
