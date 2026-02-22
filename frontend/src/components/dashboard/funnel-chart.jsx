// components/dashboard/funnel-chart.jsx
//
// Horizontal pipeline funnel chart.
// Props:
//   funnel  — array of { name, count, color, dropFromPrevious }
//             (dropFromPrevious is % drop from the previous stage, or null for first)

"use client";

export function FunnelChart({ funnel = [] }) {
  if (!funnel.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No pipeline data yet — upload resumes to see the funnel.
      </div>
    );
  }

  const maxCount = funnel[0]?.count ?? 1; // first stage is always the widest

  return (
    <div className="space-y-1">
      {funnel.map((stage, idx) => {
        const widthPct = maxCount === 0 ? 0 : Math.round((stage.count / maxCount) * 100);

        return (
          <div key={stage.name}>
            {/* Drop-off annotation between stages */}
            {stage.dropFromPrevious !== null && idx > 0 && (
              <div className="flex items-center gap-2 py-0.5 pl-28">
                <div className="h-px w-4 bg-border" />
                <span className="text-xs text-muted-foreground">
                  ▼ {stage.dropFromPrevious}% drop-off
                </span>
              </div>
            )}

            {/* Stage row */}
            <div className="flex items-center gap-3">
              {/* Label */}
              <span className="w-24 shrink-0 text-right text-sm font-medium text-foreground">
                {stage.name}
              </span>

              {/* Bar */}
              <div className="flex-1 h-8 rounded bg-muted">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stage.color,
                    minWidth: stage.count > 0 ? "2px" : "0",
                  }}
                />
              </div>

              {/* Count */}
              <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {stage.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
