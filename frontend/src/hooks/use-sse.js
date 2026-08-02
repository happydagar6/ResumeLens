"use client";

// frontend/src/hooks/use-sse.js
// Opens a persistent SSE connection to GET /api/events on the backend.
// The server pushes events (like "screening_complete") over this connection.
// We listen and automatically refresh the relevant React Query caches —
// so the candidate cards update instantly without any page refresh.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL } from "../lib/constants";
import { RESUME_KEYS } from "./use-resume";
import { SCREENING_KEYS } from "./use-screening";

export function useSSE(isAuthenticated = false) {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Only connect if the user is logged in — no point opening a connection for guests
        if (!isAuthenticated) return;

        // Open a persistent SSE connection to the backend.
        // The browser keeps this HTTP connection open indefinitely.
        // 'withCredentials: true' sends the auth cookie so the server knows who you are.
        const eventSource = new EventSource(`${API_URL}/events`, {
            withCredentials: true,
        });

        // ── Event: connection confirmed ──────────────────────────────────────
        // The backend sends this immediately when the connection opens.
        eventSource.addEventListener("connected", (e) => {
            console.log("[SSE] Connected to real-time server:", JSON.parse(e.data).message);
        });

        // ── Event: a resume finished AI screening ────────────────────────────
        // BullMQ worker fires this the moment a pipeline completes.
        eventSource.addEventListener("screening_complete", (e) => {
            const { resumeId, jobId, score, recommendation, screeningId } = JSON.parse(e.data); // parses the JSON data from the event

            // Tell React Query to re-fetch the resume list for this job.
            // This causes the candidate row to flip from "Screening..." → "Screened ✅"
            queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(jobId) });

            // Also refresh the screenings table so the score appears immediately
            queryClient.invalidateQueries({ queryKey: SCREENING_KEYS.byJob(jobId) });

            // Show a toast with the result
            const label = recommendation?.replace(/_/g, " ") || "done";
            toast.success(`✅ Screening complete — Score: ${score}/100 (${label})`);

            console.log(`[SSE] Screening complete — Resume: ${resumeId}, Score: ${score}`);
        });

        // ── Event: a resume failed screening ────────────────────────────────
        // BullMQ worker fires this after all 3 retry attempts have failed.
        eventSource.addEventListener("screening_failed", (e) => {
            const { resumeId, jobId, error } = JSON.parse(e.data);

            // Refresh the resume list so the "error" badge shows on the candidate card
            queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byJob(jobId) });

            toast.error(`❌ Screening failed: ${error || "Unknown error"}`);
            console.error(`[SSE] Screening failed — Resume: ${resumeId}`, error);
        });

        // ── Handle connection errors ─────────────────────────────────────────
        // EventSource auto-reconnects on its own — this is just for logging.
        eventSource.onerror = () => {
            console.warn("[SSE] Connection lost — browser will auto-reconnect...");
        };

        // ── Cleanup ──────────────────────────────────────────────────────────
        // React calls this when the user logs out or the component unmounts.
        // This cleanly closes the SSE stream so we don't have dangling connections.
        return () => {
            eventSource.close();
            console.log("[SSE] Connection closed.");
        };
    }, [isAuthenticated, queryClient]);
}
