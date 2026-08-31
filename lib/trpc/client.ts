"use client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/lib/trpc/root";

// Type-only import above: no server code reaches the bundle.
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
