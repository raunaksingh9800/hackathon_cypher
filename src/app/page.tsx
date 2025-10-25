"use client";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function page() {
  return (
    <>
      {" "}
      <header className=" w-full bg-white/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">Lumo</span>
                <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">
                  1.0
                </div>
                
              </div>

              {/* <nav className="hidden md:flex items-center space-x-6">
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Home
                </a>
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Simulations
                </a>
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Analytics
                </a>
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Team
                </a>
              </nav> */}
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="#"
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
      <div className="flex flex-col w-screen h-screen mt-20">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Welcome to the Virtual Roundtable</CardTitle>
            <CardDescription>Decision Simulator for Teams</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              This simulator places your team in a real-world strategic dilemma.
              Your choices will be tracked and analyzed to reveal
              decision-making patterns, potential biases, and collaboration
              strengths.
            </p>
            <p>
              Discuss each step with your team and choose the path you
              collectively agree on. There are no right or wrong answers, only
              consequences.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full" onClick={()=> {
              window.location.href="/selection"
            }}>
              Begin Simulation
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
