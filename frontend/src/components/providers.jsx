"use client";

import { AuthProvider } from "@/hooks/use-auth";

export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
