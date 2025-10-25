import { NextResponse } from 'next/server';

// --- Configuration ---
// Re-using the same setup as your other API route
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
}

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const modelName = "gemini-2.5-flash-preview-09-2025";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

// Define the simple JSON schema we want back
const responseSchema = {
  type: "OBJECT",
  properties: {
    "openingPrompt": {
      type: "STRING",
      description: "The immersive opening prompt for the team, ending in a question."
    }
  },
  required: ["openingPrompt"]
};

// --- Prompting Logic ---

/**
 * Creates the system instruction for the AI.
 * Its role is now to *facilitate* the simulation, not create it.
 */
function getSystemInstruction(): string {
  return `
    You are 'Simulation-Host', an expert facilitator for a team decision-making simulation.
    Your task is to take the provided team details and scenario, and generate the *very first* prompt to begin the simulation.

    This opening prompt must be immersive. It should:
    1.  Briefly set the scene based on the scenario title and description.
    2.  Clearly present the core dilemma and key decision.
    3.  Address the team directly (e.g., "Your team...").
    4.  End with a single, clear, open-ended question to kick off their discussion.

    You MUST return your response as a JSON object matching the requested schema.
  `;
}

/**
 * Creates the user-specific prompt with the scenario data.
 */
function buildUserPrompt(teamSize: number, domain: string, scenario: any): string {
  return `
    Here is the simulation setup:

    TEAM SIZE: ${teamSize}
    DOMAIN: ${domain}

    SCENARIO:
    Title: ${scenario.title}
    Description: ${scenario.description}
    Key Decision: ${scenario.keyDecision}

    ---

    Craft the compelling opening prompt for the team to begin this simulation.
  `;
}

// --- The API Endpoint ---

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request body
    const { teamSize, domain, scenario } = (await request.json()) as {
      teamSize?: number;
      domain?: string;
      scenario?: { title: string; description: string; keyDecision: string };
    };

    // 2. Validate the inputs
    if (!teamSize || !domain || !scenario || !scenario.title || !scenario.description || !scenario.keyDecision) {
      return NextResponse.json({ error: "Invalid teamSize, domain, or scenario data provided" }, { status: 400 });
    }

    const systemInstruction = getSystemInstruction();
    const userPrompt = buildUserPrompt(teamSize, domain, scenario);

    // 3. Construct the payload for the Gemini API
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
      safetySettings,
    };

    // 4. Make the API call
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
    
    // 5. Extract and parse the response
    const candidate = result.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!candidate || !text || typeof text !== 'string' || text.trim().length === 0) {
      console.error("Invalid or empty response content from Gemini:", result);
      return NextResponse.json({ error: "Invalid response structure from AI model" }, { status: 500 });
    }

    // The model may include extra commentary or whitespace around the JSON; try to extract a JSON object safely.
    let openingPrompt: string | undefined;
    try {
      let jsonText = text.trim();

      // If the trimmed text doesn't start with '{', attempt to find the first JSON object in the string.
      if (!jsonText.startsWith('{')) {
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.slice(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(jsonText);
      openingPrompt = parsed?.openingPrompt;
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", text, e);
      return NextResponse.json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }

    if (!openingPrompt) {
      console.error("Parsed JSON missing openingPrompt:", text);
      return NextResponse.json({ error: "AI response missing openingPrompt" }, { status: 500 });
    }

    // 7. Send the structured JSON response to the frontend
    return NextResponse.json({ openingPrompt });

  } catch (error) {
    console.error("Error in /api/makeinterview:", error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
