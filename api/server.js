const app = require('./index'); // Adjust the path if `api/index.js` is located elsewhere

const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running locally at http://localhost:${PORT}`);
});