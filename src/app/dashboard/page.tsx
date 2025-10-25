'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { XCircle, Loader2, ListTree } from 'lucide-react';

// --- Type Definitions ---
interface Simulation {
  id: string;
  teamSize: number;
  domain: string;
  status: 'pending' | 'analyzed' | 'error';
  analysis?: {
    overallScore: number; // We only need the score on this page
  };
  createdAt?: any; 
}

// --- Dashboard Page Component ---
export default function DashboardPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all simulations on component mount
  useEffect(() => {
    async function fetchSimulations() {
      try {
        setIsLoading(true);
        setError(null);
        // This hits the /api/simulations route (the list route)
        const response = await fetch('/api/simulations'); 
        if (!response.ok) {
          throw new Error('Failed to fetch simulations');
        }
        const data = (await response.json()) as Simulation[];
        setSimulations(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSimulations();
  }, []);

  // --- Render Functions ---

  const renderLoading = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
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
        <p>Could not load simulations: {error}</p>
      </CardContent>
    </Card>
  );

  const renderEmpty = () => (
     <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTree /> No Simulations Found
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>There are no simulations to display yet. Once you run a simulation, it will appear here.</p>
      </CardContent>
    </Card>
  );

  const renderTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Simulation Dashboard</CardTitle>
        <CardDescription>
          Review all completed team simulations and their performance analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Simulation ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Team Size</TableHead>
              <TableHead>Overall Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simulations.map((sim) => (
              <TableRow key={sim.id}>
                <TableCell className="font-medium truncate max-w-[200px]">{sim.id}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      sim.status === 'analyzed' ? 'default' : 
                      sim.status === 'pending' ? 'secondary' : 'destructive'
                    }
                    className="capitalize"
                  >
                    {sim.status}
                  </Badge>
                </TableCell>
                <TableCell>{sim.domain}</TableCell>
                <TableCell>{sim.teamSize}</TableCell>
                <TableCell>
                  {sim.analysis ? (
                    <span className="font-bold">{sim.analysis.overallScore} / 100</span>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {/* This button is now a link to the detail page */}
                  <Button asChild variant="outline" size="sm" disabled={!sim.analysis}>
                    <a href={`/dashboard/${sim.id}`} target="_blank" rel="noopener noreferrer">
                      View Analysis
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // --- Main Return ---
  return (
    <div className="container mx-auto p-4 md:p-8">
      {isLoading ? renderLoading() : 
       error ? renderError() :
       !simulations || simulations.length === 0 ? renderEmpty() :
       renderTable()
      }
    </div>
  );
}

