"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Circle, Clock, XCircle, Search, Building2, Briefcase } from "lucide-react";

export default function StatusTrackerPage() {
  const params = useParams();
  const resumeId = params?.resumeId;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resumeId) return;

    async function fetchStatus() {
      try {
        const res = await fetch(`http://localhost:5000/api/public/status/${resumeId}`);
        const result = await res.json();
        
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch status");
        }

        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [resumeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Locating application...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="bg-white dark:bg-zinc-900 border rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Application Not Found</h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find an application with this tracking link. Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Application Received", desc: "We've received your resume" },
    { num: 2, title: "Under Review", desc: "Being reviewed by our team" },
    { num: 3, title: "Decision Made", desc: "A final update is ready" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex justify-center p-4 py-12 md:py-24">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Hi, {data.candidateName.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground">Here is the status of your application.</p>
          </div>
          
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-xl p-4 w-full md:w-auto">
            <div className="flex items-center gap-2 text-sm font-medium mb-1.5">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>{data.jobTitle}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{data.company}</span>
            </div>
          </div>
        </div>

        {/* Tracker Section */}
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-xs">
          
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm">
              <Search className="h-4 w-4" />
              {data.friendlyStatus}
            </div>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-6.75 md:left-1/2 md:-translate-x-1/2 top-4 bottom-4 w-0.5 bg-muted"></div>
            
            <div className="space-y-8 relative">
              {steps.map((step) => {
                const isActive = data.activeStep === step.num;
                const isPast = data.activeStep > step.num;
                
                return (
                  <div key={step.num} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    
                    {/* Left Side (Desktop) */}
                    <div className="hidden md:block w-[40%] text-right pr-8">
                      <h3 className={`font-semibold ${isPast || isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                    </div>

                    {/* Center Icon */}
                    <div className="relative z-10 w-14 h-14 shrink-0 rounded-full bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 flex items-center justify-center">
                      {isPast ? (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : isActive ? (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Circle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Right Side (Mobile & Desktop) */}
                    <div className="w-full pl-16 md:pl-8 md:w-[40%] -mt-12 md:mt-0">
                       {/* Mobile title/desc (hidden on desktop where left side takes over) */}
                       <div className="md:hidden">
                        <h3 className={`font-semibold ${isPast || isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
