import { NextResponse } from 'next/server';

// --- Configuration ---
// We check for the API key as your original code did.
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
}

// Use the API key from environment variables.
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
// Use the model specified in my instructions for this kind of task.
const modelName = "gemini-2.5-flash-preview-09-2025"; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

// Safety settings as plain JSON, no SDK import needed.
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

// Define the precise JSON schema we want Gemini to return.
// This ensures we get a list of 10 scenarios in a format the frontend can render.
const responseSchema = {
  type: "ARRAY",
  description: "A list of 5j scenario objects.",
  items: {
    type: "OBJECT",
    properties: {
      "title": { 
        type: "STRING",
        description: "A short, catchy title for the scenario (e.g., 'The Data Breach Dilemma')." 
      },
      "description": { 
        type: "STRING",
        description: "A 2-3 sentence summary of the dilemma the team faces."
      },
      "keyDecision": { 
        type: "STRING",
        description: "The primary, high-stakes decision the team must make (e.g., 'Go public with the breach now, or wait for more information?')."
      },
    },
    required: ["title", "description", "keyDecision"]
  },
  minItems: 10,
  maxItems: 10
};

// --- Prompting Logic ---

/**
 * Creates the system instruction based on the context you provided.
 * This tells the AI its role and the overall goal.
 */
function getSystemInstruction(): string {
  return `
    You are 'ScenarioGen-Pro', an expert designer of corporate training simulators.
    Your task is to analyze a team's domain and size, then generate a list of 10 compelling, scenario-based simulators.

    CONTEXT:
    - PROBLEM: The goal is to create a digital simulator that places teams in real-world ethical or strategic dilemmas to study how they make decisions under pressure.
    - IDEAS: These scenarios must have multiple decision paths. They will be used to understand and improve how teams make decisions collectively.
    - GOAL: The scenarios should be complex, with no easy or obvious right answer, forcing the team to collaborate, reason, and confront potential biases.

    You MUST return your response as a JSON array of 10 objects, matching the provided schema. Do not include any other text, markdown, or explanation—just the valid JSON array.
  `;
}

/**
 * Creates the user-specific prompt.
 */
function buildUserPrompt(teamSize: number, domain: string): string {
  return `
    Generate 10 unique scenarios for a team of ${teamSize} people in the ${domain} domain.
  `;
}

// --- The API Endpoint ---

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request body
    const { teamSize, domain } = (await request.json()) as { teamSize?: number, domain?: string };

    // 2. Validate the inputs
    if (!teamSize || typeof teamSize !== 'number' || teamSize <= 0) {
      return NextResponse.json({ error: "Invalid 'teamSize' provided. Must be a positive number." }, { status: 400 });
    }
    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
      return NextResponse.json({ error: "Invalid 'domain' provided. Must be a non-empty string." }, { status: 400 });
    }

    const systemInstruction = getSystemInstruction();
    const userPrompt = buildUserPrompt(teamSize, domain);

    // 3. Construct the payload for the Gemini API
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.8, // Increased for more creative scenarios
        maxOutputTokens: 8192, // Ample space for 10 detailed scenarios
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
      safetySettings,
    };

    // 4. Make the API call using fetch
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error from Gemini API:", errorBody);
        return NextResponse.json({ error: `Gemini API error: ${response.statusText}`, details: errorBody }, { status: response.status });
    }

    const result = await response.json();
    
    // 5. Extract the generated text
    const candidate = result.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      console.error("Invalid response structure from Gemini:", result);
      return NextResponse.json({ error: "Invalid response structure from AI model" }, { status: 500 });
    }

    // 6. Parse the JSON string from the AI
    // The 'text' part *is* the JSON string we asked for.
    const scenariosJson = candidate.content.parts[0].text;
    const scenarios = JSON.parse(scenariosJson); // Parse the string into a real JSON array

    // 7. Send the structured JSON array to the frontend
    return NextResponse.json(scenarios);

  } catch (error) {
    console.error("Error in API route:", error);
    if (error instanceof SyntaxError) {
        // This catches errors from JSON.parse()
        return NextResponse.json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
