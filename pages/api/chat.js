// pages/api/chat.js
import Anthropic from "@anthropic-ai/sdk";
import { SANDO_SYSTEM } from "../../lib/sando-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "Missing messages" });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SANDO_SYSTEM,
      messages,
    });
    return res.status(200).json({ reply: message.content[0].text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
