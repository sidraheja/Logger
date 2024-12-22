const express = require('express');
const router = express.Router();

// Example API route
router.get('/status', (req, res) => {
  res.json({ message: 'API is running!' });
});

module.exports = router;

