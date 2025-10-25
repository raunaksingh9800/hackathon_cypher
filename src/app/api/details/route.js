import { NextRequest, NextResponse } from 'next/server';
// 1. IMPORT FROM THE CORRECT ADMIN FILE
import { db } from '@/lib/firebase-admin'; 
// 2. IMPORT THE ADMIN TIMESTAMP
import { Timestamp } from 'firebase-admin/firestore';

// --- Type definitions for the response ---
// We keep these here as comments to ensure we match the shape
// interface TranscriptEntry {
//   role: 'user' | 'model' | 'host';
//   content: string;
// }
// interface SimulationResponse {
//   id: string;
//   teamSize: number;
//   domain: string;
//   status: string;
//   transcript: TranscriptEntry[];
//   analysis?: Analysis;
//   createdAt?: string | null;
// }

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing simulation ID' }, { status: 400 });
  }

  try {
    // This `db` is now the ADMIN db, which has permission
    const docRef = db.collection('simulations').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    const data = docSnap.data();
    if (!data) {
      return NextResponse.json({ error: 'Simulation data is empty' }, { status: 404 });
    }

    // --- Transform Firestore data to match frontend types ---

    const firestoreTranscript = data.transcript || [];
    const frontendTranscript = firestoreTranscript.map(
      (entry) => ({
        // Map 'team' to 'user' as required by the frontend
        role: entry.role === 'team' ? 'user' : entry.role,
        content: entry.content,
        // We explicitly omit the 'timestamp'
      })
    );

    let createdAtISO = null;
    // Check if createdAt exists and is a Firestore Timestamp
    if (data.createdAt && data.createdAt instanceof Timestamp) {
      createdAtISO = data.createdAt.toDate().toISOString();
    }

    // Build the final response object that matches the frontend type
    const simulationResponse = {
      id: docSnap.id,
      teamSize: data.teamSize,
      domain: data.domain,
      status: data.status,
      analysis: data.analysis, // This object structure already matches
      transcript: frontendTranscript,
      createdAt: createdAtISO,
    };

    return NextResponse.json(simulationResponse);
    
  } catch (error) {
    console.error('Error fetching simulation:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check for auth errors specifically
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      errorMessage = 'Server authentication error. Check your Firebase Admin SDK credentials and .env.local file.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
