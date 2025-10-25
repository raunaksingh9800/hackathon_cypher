import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// --- Firebase Configuration ---
// YOU MUST SET THESE ENVIRONMENT VARIABLES
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Gemini Configuration ---
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
}
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const modelName = "gemini-2.5-flash-lite";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

// --- Analysis Schema ---
// This is what we will force Gemini to return.
const responseSchema = {
  type: "OBJECT",
  properties: {
    overallScore: {
      type: "NUMBER",
      description:
        "A single, holistic score from 1-100 for the team's performance.",
    },
    keyStrengths: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "A list of 2-3 key strengths the team demonstrated.",
    },
    growthAreas: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "A list of 2-3 critical areas for improvement.",
    },
    actionableFeedback: {
      type: "STRING",
      description:
        "One concise, powerful paragraph of actionable advice for the team. This is the 'how to improve' part and add the text which needs to be improved.",
    },
    heatmapData: {
      type: "OBJECT",
      description:
        "A key-value map of 5-7 core metrics and their scores (1-10).",
      properties: {
        Decisiveness: {
          type: "NUMBER",
          description:
            "Score 1-10. 1=Paralyzed, 10=Acted swiftly and confidently.",
        },
        "Ethical Focus": {
          type: "NUMBER",
          description:
            "Score 1-10. 1=Ignored ethics, 10=Ethics were central to the decision.",
        },
        "Data-Driven": {
          type: "NUMBER",
          description:
            "Score 1-10. 1=Pure gut-feel, 10=Used available data to inform the decision.",
        },
        "Long-Term Thinking": {
          type: "NUMBER",
          description:
            "Score 1-10. 1=Purely short-term fix, 10=Considered long-term impact.",
        },
        "Bias for Action": {
          type: "NUMBER",
          description:
            "Score 1-10. 1=Analysis paralysis, 10=Acted on their plan.",
        },
        Collaboration: {
          type: "NUMBER",
          description:
            "Score 1-10. 1=One person dominated, 10=All members contributed and built on ideas.",
        },
      },
    },
  },
  required: [
    "overallScore",
    "keyStrengths",
    "growthAreas",
    "actionableFeedback",
    "heatmapData",
  ],
};

// --- Prompting Logic ---
function getSystemInstruction(): string {
  return `
    You are 'Lead Analyst-AI', a world-class organizational psychologist and corporate strategist.
    Your job is to analyze a *complete* simulation transcript and provide a "WorkDNA" analysis.

    The user will provide the team's context (size, domain) and the full transcript.

    focus on how the TEAM replies to the HOST , if language and professionalism is not upto the mark them red.
    make sure to account if the team replies in split like Member 1 said somthing member 2 said somthing and soo on, but if
    the team replies in collective response then no worries.

    Analyze the *entire* conversation. Look for patterns, biases, strengths, and weaknesses.
    - How did they handle pressure?
    - Did they fall into groupthink?
    - Did they consider the ethical or long-term consequences?
    - Was their reasoning sound?
    - Did they act decisively or get stuck in 'analysis paralysis'?

    GOAL: Understand and improve how this team makes decisions collectively.
    
    You MUST return your analysis in the requested JSON format. Do not add *any* other text.
  `;
}

function buildUserPrompt(
  teamSize: number,
  domain: string,
  transcript: any[]
): string {
  // Convert transcript to a simple, readable string

  const transcriptText = transcript
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join("\n");
  console.log(transcriptText);
  return `
    ANALYZE THE FOLLOWING SIMULATION:

    CONTEXT:
    - Team Size: ${teamSize}
    - Domain: ${domain}

    TRANSCRIPT:
    ---
    ${transcriptText}
    ---

    Provide your full analysis in the structured JSON format.
  `;
}

// --- The API Endpoint ---
export async function POST(request: Request) {
  try {
    const { docId } = (await request.json()) as { docId: string };

    if (!docId) {
      return NextResponse.json(
        { error: "No document ID provided" },
        { status: 400 }
      );
    }

    // 1. Get the simulation data from Firestore
    const docRef = doc(db, "simulations", docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      );
    }

    const simData = docSnap.data();
    const { teamSize, domain, transcript } = simData;

    if (!transcript || transcript.length < 2) {
      return NextResponse.json(
        { error: "Transcript is too short to analyze" },
        { status: 400 }
      );
    }

    // If analysis already exists, just return it.
    if (simData.analysis) {
      return NextResponse.json(simData.analysis);
    }

    // 2. Build the Gemini request
    const systemInstruction = getSystemInstruction();
    const userPrompt = buildUserPrompt(teamSize, domain, transcript);

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
      // Safety settings from your other file
    };

    // 3. Call Gemini API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const analysisJson = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisJson) {
      throw new Error("Invalid response structure from AI model");
    }

    const analysis = JSON.parse(analysisJson);

    // 4. Save the analysis back to Firestore
    await updateDoc(docRef, {
      analysis: analysis,
      status: "analyzed",
    });

    // 5. Return the analysis to the frontend
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error in /api/analyze-interview:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
