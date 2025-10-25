import { NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentRequest,
} from "@google/generative-ai";
import { WorkDNA } from '@/lib/types'; // Assuming this is your scenario type

// --- Configuration ---
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

const generationConfig = {
  temperature: 0.8, // Slightly higher for more dynamic/creative responses
  topK: 1,
  topP: 1,
  maxOutputTokens: 1024, // Increased from 256. This fixed the MAX_TOKENS error.
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Type Definitions (align with your Firestore model) ---
type Scenario = {
  title: string;
  description: string;
  keyDecision: string;
};

type TranscriptEntry = {
  role: "host" | "team";
  content: string;
  // timestamp?: any; // Not needed for the API call
};

type NextPromptRequest = {
  teamSize: number;
  domain: string;
  scenario: Scenario;
  transcript: TranscriptEntry[];
};

// --- Prompting Logic ---

/**
 * This is the "persona" for the AI. It sets the rules for how it behaves.
 */
function getSystemInstruction(): string {
  return `
You are the 'Host' of a realistic, high-pressure business simulation.
Your role is to guide a 'Team' (the user) through a complex scenario.
You must read the ENTIRE transcript to understand the conversation so far.
Your job is to provide the *next* logical prompt in the conversation.

CRITICAL RULES:
1.  **NEVER break character.** You are the 'Host', not an AI assistant.
2.  **BE CONCISE.** Your response must be 1-3 sentences.
3.  **DRIVE THE SCENARIO.** Introduce new information, a consequence of their last action, or a question from a new stakeholder (e.g., "The legal team is concerned...", "The media has just published...", "What data will you use to...").
4.  **DO NOT analyze or pass judgment.** (That is a different AI's job).
5.  **DO NOT end the simulation.** Your goal is to continue it.
6.  **RETURN ONLY YOUR PROMPT.** Do NOT add commentary like "Here is the next prompt:" or "Host:". Just return the text of your next line.
  `;
}

/**
 * This function builds the prompt we send to Gemini, combining the context
 * and the full chat history into a single string.
 */
function buildUserPrompt(
  { teamSize, domain, scenario, transcript }: NextPromptRequest
): string {

  // Convert the array of objects into a simple, readable string
  const transcriptText = transcript
    .map(entry => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join("\n");

  return `
CONTEXT:
-   **Scenario:** ${scenario.title} (${scenario.keyDecision})
-   **Domain:** ${domain}
-   **Team Size:** ${teamSize}

FULL TRANSCRIPT:
---
${transcriptText}
---

Based on the team's *last* response, provide the *next* Host prompt.
Remember the rules: be concise, drive the story, and do NOT break character.
  `;
}

// --- The API Endpoint ---
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NextPromptRequest;

    // --- Input Validation ---
    if (!body.transcript || body.transcript.length === 0) {
      return NextResponse.json({ error: "Transcript is empty" }, { status: 400 });
    }
    if (!body.scenario) {
      return NextResponse.json({ error: "No scenario provided" }, { status: 400 });
    }

    // --- Build the Request ---
    const systemInstruction = getSystemInstruction();
    const userPrompt = buildUserPrompt(body);

    const payload: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
      generationConfig,
      safetySettings,
    };

    // --- Call Gemini API ---
    // We use the stateless `generateContent` method, not `startChat`,
    // because we send the full history every time.
    const response = await model.generateContent(payload);

    // --- Check for valid response ---
    const candidate = response.response.candidates?.[0];
    const nextPrompt = candidate?.content?.parts?.[0]?.text;

    if (!nextPrompt) {
      // Detailed logging to find out *why* it failed
      console.error("AI did not return a valid text response.");
      console.error("Finish Reason:", candidate?.finishReason);
      console.error("Safety Ratings:", JSON.stringify(candidate?.safetyRatings, null, 2));
      throw new Error("AI did not return a valid response.");
    }

    // --- Clean the Response ---
    // The model will sometimes add "Host: " or quotes. We remove them.
    const cleanedPrompt = nextPrompt
      .replace(/^Host:/i, "") // Remove "Host:" from the start
      .replace(/"/g, "")      // Remove all quotation marks
      .trim();                // Remove leading/trailing whitespace

    return NextResponse.json({ nextPrompt: cleanedPrompt });

  } catch (error) {
    console.error("Error in /api/next-prompt:", error);
    // Use type assertion for error message
    const errorMessage = (error instanceof Error) ? error.message : "Unknown error";
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}
