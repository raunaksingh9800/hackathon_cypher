import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore"; // Import query/orderBy

// --- Firebase Configuration ---
// Ensure your environment variables are set
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

// --- API Endpoint to GET all simulations ---
export async function GET(request: Request) {
  try {
    // Query the "simulations" collection
    // Adding a basic query, e.g., order by a 'createdAt' timestamp if you have one.
    // If not, just collection(db, "simulations") is fine.
    // Let's assume you have 'createdAt' for useful sorting
    const simulationsCollection = collection(db, "simulations");
    // const q = query(simulationsCollection, orderBy("createdAt", "desc")); // Example query
    
    // Fetch all documents
    const querySnapshot = await getDocs(simulationsCollection); // Use 'q' if you have the query

    if (querySnapshot.empty) {
      return NextResponse.json([]); // Return empty array if no documents
    }

    // Map documents to an array, adding the document ID
    const simulations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Return the list of simulations
    return NextResponse.json(simulations);

  } catch (error) {
    console.error("Error fetching simulations:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
