"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClient({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    return url ? new ConvexReactClient(url) : null;
  }, []);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="font-mono text-sm opacity-70">
          Configure <code>NEXT_PUBLIC_CONVEX_URL</code> rode <code>npx convex dev</code>
        </p>
      </div>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
