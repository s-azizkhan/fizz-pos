import "server-only";
import { cache } from "react";
import { createCallerFactory, createContext } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/root";

// In-process caller for RSC pages: no HTTP, no serialization, no client
// waterfall. Memoized per render so the context (and its DB hit) is built once.
const createCaller = createCallerFactory(appRouter);
export const trpc = cache(async () => createCaller(await createContext()));
