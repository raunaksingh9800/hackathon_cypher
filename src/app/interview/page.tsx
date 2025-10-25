"use client";
import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Card,
    CardHeader,
    CardDescription,
    CardContent,
    CardTitle,
    CardFooter, // Added CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// FIREBASE: Import the db instance and doc management functions
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";

type Scenario = {
    title: string;
    description: string;
    keyDecision: string;
};

// FIREBASE: Define the transcript entry structure
type TranscriptEntry = {
    role: "host" | "team";
    content: string;
    timestamp: Timestamp;
};

// Simple LoadingSpinner used in Suspense and while waiting for responses
function LoadingSpinner() {
    return (
        <div role="status" className="flex items-center justify-center p-4">
            <svg
                className="animate-spin h-6 w-6 text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="sr-only">Loading...</span>
        </div>
    );
}

function InterviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter(); // For navigating to analysis
    
    // State for the page
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [teamSize, setTeamSize] = useState<number>(0);
    const [domain, setDomain] = useState<string>("");
    
    // State for the interview flow
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userResponse, setUserResponse] = useState<string>("");

    // FIREBASE: State to hold the chat history and new doc ID
    const [simulationDocId, setSimulationDocId] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    
    // FIREBASE: Use a ref to prevent double-running the init logic
    const initHasRun = useRef(false);

    // --- ADDED ---
    // Ref for the scrollable transcript area
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect runs once on page load to create the doc and fetch the first prompt
        if (initHasRun.current) return;
        initHasRun.current = true;

        const initializeInterview = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // 1. Get data from query parameters
                const encodedScenario = searchParams.get("scenario");
                const teamSizeParam = searchParams.get("teamSize");
                const domainParam = searchParams.get("domain");

                if (!encodedScenario || !teamSizeParam || !domainParam) {
                    throw new Error("Missing simulation data. Please go back.");
                }

                const decodedJson = decodeURIComponent(escape(atob(encodedScenario)));
                const parsedScenario: Scenario = JSON.parse(decodedJson);
                const parsedTeamSize = parseInt(teamSizeParam);
                
                setScenario(parsedScenario);
                setTeamSize(parsedTeamSize);
                setDomain(domainParam);

                // 2. FIREBASE: Create the new simulation document in Firestore
                const docData = {
                    teamSize: parsedTeamSize,
                    domain: domainParam,
                    scenario: parsedScenario,
                    status: "pending",
                    createdAt: Timestamp.now(),
                    transcript: [], // Start with an empty transcript
                };
                const docRef = await addDoc(collection(db, "simulations"), docData);
                setSimulationDocId(docRef.id); // Save the new document's ID

                // 3. Call API to get the opening prompt
                const res = await fetch("/api/makeinterview", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        teamSize: parsedTeamSize,
                        domain: domainParam,
                        scenario: parsedScenario,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to start simulation.");

                const openingPrompt = data.openingPrompt;
                
                // 4. FIREBASE: Save the first prompt to state and Firestore
                const hostEntry: TranscriptEntry = {
                    role: "host",
                    content: openingPrompt,
                    timestamp: Timestamp.now(),
                };
                
                await updateDoc(doc(db, "simulations", docRef.id), {
                    transcript: [hostEntry] // Add the first entry
                });
                
                setTranscript([hostEntry]); // Set local state

            } catch (err) {
                console.error(err);
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        initializeInterview();
    }, [searchParams]);

    // --- ADDED ---
    // This effect scrolls the transcript area to the bottom when new messages are added
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [transcript]); // Dependency: run this every time the transcript changes

    const handleSubmitResponse = async () => {
        if (!userResponse.trim() || !simulationDocId) return;

        setLoading(true); // Show loading for the turn
        setError(null);

        try {
            // 1. FIREBASE: Create the team's entry
            const teamEntry: TranscriptEntry = {
                role: "team",
                content: userResponse,
                timestamp: Timestamp.now(),
            };
            
            // 2. FIREBASE: Update local state and Firestore with the team's turn
            // We update state first, which will trigger the scroll effect
            const newTranscript = [...transcript, teamEntry];
            setTranscript(newTranscript);
            
            const docRef = doc(db, "simulations", simulationDocId);
            await updateDoc(docRef, { transcript: newTranscript });
            
            setUserResponse(""); // Clear the textarea

            // 3. CALL /api/next-prompt with the full transcript (strip timestamps)
            const payload = {
                teamSize,
                domain,
                scenario,
                transcript: newTranscript.map((t) => ({ role: t.role, content: t.content })),
            };

            const res = await fetch("/api/next-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                // API returned an error; surface it
                throw new Error(data?.error || data?.details || "Failed to get next prompt");
            }

            const nextPrompt = data?.nextPrompt;
            if (!nextPrompt || typeof nextPrompt !== "string") {
                throw new Error("Invalid response from host API");
            }

            // 4. FIREBASE: Save host response to Firestore and local state
            // This will trigger the scroll effect again
            const hostEntry: TranscriptEntry = {
                role: "host",
                content: nextPrompt,
                timestamp: Timestamp.now(),
            };
            const finalTranscript = [...newTranscript, hostEntry];
            setTranscript(finalTranscript);
await updateDoc(docRef, { transcript: finalTranscript });

        } catch (err) {
            console.error("Error submitting response / fetching next prompt:", err);
            setError((err as Error).message);
            // Leave the user's entry in place so they can retry or continue.
        } finally {
            setLoading(false);
        }
    };
    
    const handleFinishSimulation = async () => {
        if (!simulationDocId) return;
        
        setLoading(true);
        setError(null);
        try {
            // 1. FIREBASE: Mark the simulation as completed
            const docRef = doc(db, "simulations", simulationDocId);
            await updateDoc(docRef, {
                status: "completed"
            });
            
            // 2. Navigate to the new analysis page
            // This page will be responsible for *calling* /api/analyze-interview
            router.push(`/analysis/${simulationDocId}`);
            
        } catch (err) {
            setError((err as Error).message);
            setLoading(false);
        }
    };

    // --- Render logic ---
    return (
        <>
            {/* ... (Your Header component) ... */}

            <div className="flex flex-col min-h-screen py-20 px-6 bg-gray-50">
                <Card className="w-full max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>{scenario ? scenario.title : "Loading..."}</CardTitle>
                        {scenario && (
                            <CardDescription>
                                A simulation for a team of {teamSize} in {domain}.
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loading && transcript.length === 0 && <LoadingSpinner />}
                        
                        {error && (
                            <div className="text-sm text-red-600 p-4 bg-red-50 rounded-md">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {/* FIREBASE: Render the entire transcript */}
                        {/* --- MODIFIED --- Added ref={scrollAreaRef} */}
                        <div 
                            ref={scrollAreaRef}
                            className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-md"
                        >
                            {transcript.map((entry, index) => (
                                <div key={index} className={`flex ${entry.role === 'team' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`p-3 rounded-lg max-w-[80%] whitespace-pre-line ${
                                            entry.role === 'team'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-800'
                                        }`}
                                    >
                                        {entry.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* This is the textarea for the user */}
                        <div className="space-y-2">
                            <Label htmlFor="userResponse">Your Team's Response</Label>
                            <Textarea
                                id="userResponse"
                                value={userResponse}
                                onChange={(e) => setUserResponse(e.target.value)}
                                placeholder="Type your team's response..."
                                rows={5}
                                disabled={loading}
                            />
                        </div>

                        <Button
                            size="lg"
                            className="w-full"
                            onClick={handleSubmitResponse}
                            disabled={!userResponse.trim() || loading}
                        >
                            {loading ? "Waiting for host..." : "Submit Response"}
                        </Button>
                    </CardContent>
                    
                    {/* FIREBASE: Add a footer with a "Finish" button */}
                    <CardFooter className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={handleFinishSimulation}
                            disabled={loading || transcript.length < 2}
                        >
                            Finish & Analyze Simulation
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <InterviewContent />
        </Suspense>
    );
}
