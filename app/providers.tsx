"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const ConvexClient = dynamic(() => import("./convex-client"), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexClient>{children}</ConvexClient>;
}
