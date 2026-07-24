"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../hooks/use-auth";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useSSE } from "../hooks/use-sse";

// Inner component — lives INSIDE QueryClientProvider and AuthProvider,
// so it has access to both the query client and the logged-in user.
// This is the correct place to mount the SSE hook.
function SSEBridge() {
  const { user } = useAuth();
  // Start SSE connection only when the user is authenticated.
  // When user logs out, useSSE cleans up the connection automatically.
  useSSE(Boolean(user));
  return null; // Renders nothing — just wires up the side effect
}

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 3, // Retry failed requests up to 2 times
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SSEBridge />
        {children}
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}