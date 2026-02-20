"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import StatsCards from "@/components/dashboard/stats-cards";
import { LoadingSpinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Brain, Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const jobsData = await api.get("/jobs");
        const jobs = jobsData.data?.jobs || [];

        setStats([
          { label: "Total Jobs", value: jobs.length, icon: Briefcase },
          { label: "Open Jobs", value: jobs.filter((j) => j.status === "open").length, icon: Briefcase },
          { label: "Draft Jobs", value: jobs.filter((j) => j.status === "draft").length, icon: FileText },
          { label: "Closed Jobs", value: jobs.filter((j) => j.status === "closed").length, icon: Brain },
        ]);
      } catch {
        setStats([]);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to RecruitAI. Manage your recruitment pipeline.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Link>
        </Button>
      </div>

      {stats && <StatsCards stats={stats} />}
    </div>
  );
}
