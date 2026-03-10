// pages/api/analyze.js
import Anthropic from "@anthropic-ai/sdk";
import { SANDO_SYSTEM, buildAnalysisPrompt } from "../../lib/sando-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ticker, quote, signals, ratios } = req.body;
  if (!ticker || !quote || !signals) return res.status(400).json({ error: "Missing data" });

  try {
    const userPrompt = buildAnalysisPrompt(ticker, quote, signals, ratios);
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SANDO_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    return res.status(200).json({ analysis: message.content[0].text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
