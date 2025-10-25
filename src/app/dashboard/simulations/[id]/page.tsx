'use client';

import { useState, useEffect } from 'react';
// This is the correct way to get the [id] from the URL
import { useParams } from 'next/navigation';

// ShadCN UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Recharts for charts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
// Lucide Icons
import { XCircle, Loader2, Bot, User } from 'lucide-react';

// --- Type Definitions (from your original file) ---
interface HeatmapData {
  Decisiveness: number;
  'Ethical Focus': number;
  'Data-Driven': number;
  'Long-Term Thinking': number;
  'Bias for Action': number;
  Collaboration: number;
  [key: string]: number;
}

interface Analysis {
  overallScore: number;
  keyStrengths: string[];
  growthAreas: string[];
  actionableFeedback: string;
  heatmapData: HeatmapData;
}

interface TranscriptEntry {
  role: 'user' | 'model' | 'host';
  content: string;
}

// This type MUST match the JSON response from your API route
interface Simulation {
  id: string;
  teamSize: number;
  domain: string;
  status: 'pending' | 'analyzed' | 'error';
  transcript: TranscriptEntry[];
  analysis?: Analysis;
  createdAt?: string; // API route serializes this to an ISO string
}

// --- Detail Page Component ---
export default function SimulationDetailPage() {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get route parameters from Next.js
  const params = useParams();
  // Ensure 'id' is a single string. Handle array or undefined cases.
  const simulationId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Fetch data *only* when the ID changes
  useEffect(() => {
    // Don't fetch if ID is not a valid string
    if (typeof simulationId !== 'string' || !simulationId) {
      setError('Invalid Simulation ID in URL.');
      setIsLoading(false);
      return;
    }

    async function fetchSimulation() {
      try {
        setIsLoading(true);
        setError(null);
        
        // This is where it calls your API route from the Canvas
        const response = await fetch(`/api/details?id=${simulationId}`);

        // --- Robust Error Handling ---
        if (!response.ok) {
          try {
            const errData = await response.json();
            throw new Error(errData.error || `Request failed: ${response.status}`);
          } catch (jsonError) {
            throw new Error(
              `Request failed: ${response.status}. Could not parse error response.`
            );
          }
        }

        const data = (await response.json()) as Simulation;
        setSimulation(data);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setError(
            'Failed to parse server response. API route may be down.'
          );
        } else {
          setError((err as Error).message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchSimulation();
  }, [simulationId]); // This dependency array is correct.

  // --- Helper Functions ---
  const formatHeatmapData = (data: HeatmapData) => {
    return Object.keys(data).map((key) => ({
      name: key,
      Score: data[key],
    }));
  };

  // --- UI Render Sub-Components ---

  const renderLoading = () => (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <XCircle /> Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>Could not load simulation report:</p>
        <pre className="mt-2 rounded bg-muted p-2 text-sm text-destructive-foreground">
          {error}
        </pre>
      </CardContent>
    </Card>
  );

  const renderTranscript = (transcript: TranscriptEntry[]) => (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Transcript</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
        {transcript.map((entry, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              entry.role === 'user' ? 'justify-end' : ''
            }`}
          >
            {/* Icon */}
            <div
              className={`flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center ${
                entry.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {entry.role === 'user' ? (
                <User size={16} />
              ) : (
                <Bot size={16} />
              )}
            </div>
            {/* Message Bubble */}
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                entry.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm font-bold capitalize">
                {/* Note: Your API already maps 'team' to 'user' */}
                {entry.role === 'user' ? 'Team' : 'Host'}
              </p>
              <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderAnalysisDetail = (analysis: Analysis) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Score & Feedback */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-primary">
              {analysis.overallScore}
              <span className="text-3xl text-muted-foreground">/100</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actionable Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {analysis.actionableFeedback}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Column 2: Strengths & Weaknesses */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Key Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {analysis.keyStrengths.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600">Growth Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {analysis.growthAreas.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Column 3: Heatmap Chart */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Scores from 1 (Low) to 10 (High)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formatHeatmapData(analysis.heatmapData)}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    dx={-5}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="Score"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // --- Main Return Logic ---
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : !simulation ? (
        <Card>
          <CardHeader>
            <CardTitle>No Data</CardTitle>
            <CardDescription>
              {simulationId
                ? 'Simulation not found.'
                : 'Waiting for simulation ID...'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* --- Header Card --- */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Simulation Report</CardTitle>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Badge variant="outline">
                  ID: <span className="font-mono ml-2">{simulation.id}</span>
                </Badge>
                <Badge variant="secondary">
                  Domain: <span className="ml-1">{simulation.domain}</span>
                </Badge>
                <Badge variant="secondary">
                  Team Size: <span className="ml-1">{simulation.teamSize}</span>
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* --- Transcript --- */}
          {simulation.transcript && renderTranscript(simulation.transcript)}

          {/* --- Analysis Section --- */}
          <div className="mt-6">
            {simulation.analysis ? (
              renderAnalysisDetail(simulation.analysis)
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="animate-spin" /> Analysis Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    This simulation has not been analyzed yet. The analysis will
                    appear here once it's complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
