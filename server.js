require('dotenv').config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.static("dist"));
app.use(express.json());

app.post("/api/get-jwt", async (req, res) => {
  try {
    const response = await axios.post("https://api.dartmouth.edu/api/jwt", null, {
      headers: {
        "Authorization": process.env.DARTMOUTH_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("JWT Error:", error.message);
    res.status(500).json({ error: "Failed to get JWT" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const jwt = req.headers.authorization;
    const response = await axios.post(
      "https://api.dartmouth.edu/api/ai/tgi/llama-3-8b-instruct/v1/chat/completions",
      req.body,
      {
        headers: {
          "Authorization": jwt,
          "Content-Type": "application/json"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Failed to get response from LLM" });
  }
});

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
