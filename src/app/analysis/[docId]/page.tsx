"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// This is the shape of the analysis data
type HeatmapData = {
  [key: string]: number; // e.g., "Decisiveness": 8
};
type Analysis = {
  overallScore: number;
  keyStrengths: string[];
  growthAreas: string[];
  actionableFeedback: string;
  heatmapData: HeatmapData;
};

/**
 * A simple component to render the heatmap using shadcn Card components.
 */
function TeamHeatmap({ data }: { data: HeatmapData }) {
  const getColor = (score: number) => {
    if (score <= 3) return "bg-red-100 text-red-800";
    if (score <= 7) return "bg-yellow-50 text-yellow-900";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Object.entries(data).map(([key, value]) => (
        <Card key={key} className={`${getColor(value)} p-4`}>
          <CardHeader className="p-0">
            <div className="text-sm font-medium uppercase opacity-80">{key}</div>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="text-3xl font-bold">{value}/10</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AnalysisPage() {
  const [docId, setDocId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pathSegments = window.location.pathname.split("/");
    const id = pathSegments[pathSegments.length - 1];
    if (id) {
      setDocId(id);
    }
  }, []);

  useEffect(() => {
    if (!docId) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docId }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch analysis");
        }
        setAnalysis(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [docId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Analysis...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-48 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-700">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent>No analysis found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <a href="/" className=" text-xs opacity-60 hover:cursor-pointer hover:underline">Go to home</a>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Simulation Report</CardTitle>
        </CardHeader>
        <CardContent>
          {/* --- FIX WAS HERE --- */}
          {/* The grid div was incorrectly closed immediately. */}
          {/* It now correctly wraps the two child divs. */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <div className="text-sm uppercase text-muted-foreground">Overview</div>
              <div className="mt-2 text-base text-muted-foreground">
                Team simulation analysis and actionable recommendations.
              </div>
            </div>
            <div className="text-center">
              <Badge className="uppercase">Overall Score</Badge>
              <div className="text-6xl font-extrabold text-blue-600 mt-2">{analysis.overallScore}</div>
            </div>
          </div>
          {/* --- END FIX --- */}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Team Bias & Performance Heatmap</h2>
          <div className="text-sm text-muted-foreground">Scores 1-10</div>
        </div>
        <Separator className="my-4" />
        <TeamHeatmap data={analysis.heatmapData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">Key Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <ul className="list-disc list-inside space-y-1">
                {analysis.keyStrengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-yellow-700">Growth Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <ul className="list-disc list-inside space-y-1">
                {analysis.growthAreas.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-800">Actionable Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-blue-900 leading-relaxed">{analysis.actionableFeedback}</p>
        </CardContent>
      </Card>
    </div>
  );
}
// --- FIX WAS HERE ---
// Removed trailing </div></div>"