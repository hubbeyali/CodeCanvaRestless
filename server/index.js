
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "1mb" }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(ai) });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Add GEMINI_API_KEY to your .env file."
      });
    }

    const { question, financialContext } = req.body ?? {};

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Please enter a question." });
    }

    const context =
      typeof financialContext === "string"
        ? financialContext.slice(0, 12000)
        : "No financial data was provided.";

    const result = await ai.models.generateContent({
model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are SpendSense AI, a helpful personal finance assistant.
Answer clearly and concisely using the financial context provided.
Do not invent transactions, balances, or financial facts.
If data is missing, say so.
Offer general educational guidance, not guaranteed investment advice.

Financial context:
${context}

User question:
${question.trim()}`
            }
          ]
        }
      ]
    });

    res.json({ answer: result.text || "I couldn't generate an answer. Please try again." });
  } catch (error) {
    console.error("SpendSense AI error:", error);
    res.status(500).json({
      error: "The AI request failed. Check the backend terminal for details."
    });
  }
});

app.listen(PORT, () => {
  console.log(`SpendSense backend running at http://localhost:${PORT}`);
});
