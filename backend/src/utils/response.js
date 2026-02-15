// src/utils/response.js
const response = (res, status, data, message = '') => {
  res.status(status).json({ success: status < 400, data, message });
};

module.exports = { response };