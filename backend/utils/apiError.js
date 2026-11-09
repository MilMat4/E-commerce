// Convert expected database errors into clear client responses without exposing internals.
const sendControllerError = (res, error, fallbackMessage) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.name === 'CastError' ? 'Invalid ID format.' : error.message,
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

module.exports = { sendControllerError };
