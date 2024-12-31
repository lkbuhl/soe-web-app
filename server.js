require('dotenv').config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.static("dist"));
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: req.body.messages,
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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