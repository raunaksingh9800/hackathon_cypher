"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
// Import the Skeleton component
import { Skeleton } from "@/components/ui/skeleton";

type Scenario = {
  title: string;
  description: string;
  keyDecision: string;
};

export default function SelectionPage() {
  const router = useRouter();
  const [teamSize, setTeamSize] = useState<number>(1);
  const [field, setField] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setScenarios(null);
    setSelectedIndex(null);

    if (teamSize < 1) {
      setError("Please enter a valid team size.");
      return;
    }
    if (!field.trim()) {
      setError("Please specify the field or area.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamSize, domain: field }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to generate scenarios");
        setLoading(false);
        return;
      }

      if (!Array.isArray(data)) {
        setError("Invalid response from server.");
        setLoading(false);
        return;
      }

      setScenarios(data as Scenario[]);
    } catch (err) {
      setError("Network or server error.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = (index: number) => {
    if (!scenarios) return;
    const scenario = scenarios[index];
    // encode scenario as base64 to safely pass in query
    const encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(scenario)))
    );
    router.push(
      `/interview?scenario=${encoded}&teamSize=${teamSize}&domain=${encodeURIComponent(
        field
      )}`
    );
  };

  return (
    <>
      <header className="w-full bg-white/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">Lumo</span>
                <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">
                  1.0
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:underline hidden sm:inline"
              >
                Home
              </a>
              <a
                href="/dashboard"
                className="text-sm text-muted-foreground hover:underline hidden sm:inline"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col min-h-screen py-20 px-6 bg-gray-50">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Setup Your Simulation</CardTitle>
            <CardDescription>
              Enter team details and the field to generate a decision-making
              scenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <Input
                id="teamSize"
                type="number"
                min={1}
                value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value) || 0)}
                placeholder="Enter number of team members"
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field">Field / Domain</Label>
              <Input
                id="field"
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g., Healthcare, AI Ethics, Crisis Management"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
          </CardContent>
          <CardFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Scenario"}
            </Button>
          </CardFooter>
        </Card>

        {/* --- ADDED: Skeleton Loading State --- */}
        {loading && (
          <>
            <div className="w-full flex justify-center">
              <Separator className="my-14 w-full max-w-2xl" />
            </div>

            <div className="w-full max-w-2xl mx-auto space-y-4">
              <h2 className="text-xl font-semibold">Generating Scenarios...</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <CardHeader>
                      <CardTitle className="mb-6 mt-6">
                        <Skeleton className="h-6 w-3/4" />
                      </CardTitle>
                      <CardDescription>
                        <Skeleton className="h-4 w-full" />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-5 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- MODIFIED: Show results only if NOT loading --- */}
        {!loading && scenarios && (
          <>
            <div className="w-full flex justify-center">
              <Separator className="my-14 w-full max-w-2xl" />
            </div>

            <div className="w-full max-w-2xl mx-auto  space-y-4">
              <h2 className="text-xl font-semibold">Select a Scenario</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {scenarios.map((s, i) => (
                  <Card
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={` p-4 ${
                      selectedIndex === i ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="mb-6 mt-6">{s.title}</CardTitle>
                      <CardDescription>{s.keyDecision}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <div className="mr-auto">
                        <button
                          type="button"
                          className={`p-0 m-0 hover:cursor-pointer hover:underline text-sm ${
                            selectedIndex === i
                              ? "font-bold "
                              : "font-normal"
                          }`}
                          onClick={() => handleProceed(i)}
                        >
                          Use this scenario
                        </button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}