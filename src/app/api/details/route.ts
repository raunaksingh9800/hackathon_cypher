// app/api/details/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // Adjust path if necessary
import { Timestamp } from 'firebase-admin/firestore';

// Define the frontend types *again* here to ensure
// our response matches what the client expects.
interface TranscriptEntry {
  role: 'user' | 'model' | 'host';
  content: string;
}

interface Analysis {
  overallScore: number;
  keyStrengths: string[];
  growthAreas: string[];
  actionableFeedback: string;
  heatmapData: { [key: string]: number };
}

// This is the final shape the frontend component expects
interface SimulationResponse {
  id: string;
  teamSize: number;
  domain: string;
  status: string;
  transcript: TranscriptEntry[];
  analysis?: Analysis;
  createdAt?: string | null; // Must be a serializable string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing simulation ID' }, { status: 400 });
  }

  try {
    // 1. Fetch the document from Firestore
    const docRef = db.collection('simulations').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    const data = docSnap.data();

    if (!data) {
      return NextResponse.json({ error: 'Simulation data is empty' }, { status: 404 });
    }

    // --- 2. CRITICAL: Transform Firestore data to match frontend types ---

    // 2a. Transform the transcript
    const firestoreTranscript = data.transcript || [];
    const frontendTranscript: TranscriptEntry[] = firestoreTranscript.map(
      (entry: any) => ({
        // Map 'team' to 'user' as required by the frontend
        role: entry.role === 'team' ? 'user' : entry.role,
        content: entry.content,
        // We explicitly *omit* the 'timestamp' field from the
        // transcript entries because the frontend type doesn't have it.
      })
    );

    // 2b. Convert Firestore Timestamp to a JSON-serializable string
    let createdAtISO: string | null = null;
    if (data.createdAt && data.createdAt instanceof Timestamp) {
      createdAtISO = data.createdAt.toDate().toISOString();
    }

    // 2c. Build the final response object
    const simulationResponse: SimulationResponse = {
      // Add the document ID, which isn't a field in the doc itself
      id: docSnap.id,
      
      // Map the rest of the fields
      teamSize: data.teamSize,
      domain: data.domain,
      status: data.status,
      analysis: data.analysis, // This object structure matches
      
      // Use the transformed data
      transcript: frontendTranscript,
      createdAt: createdAtISO,
      
      // We omit 'scenario' because it's not in the frontend `Simulation` type
    };

    // 3. Return the transformed data
    return NextResponse.json(simulationResponse);
    
  } catch (error) {
    console.error('Error fetching simulation:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}