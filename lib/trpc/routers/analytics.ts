import { z } from "zod";
import { getAnalytics } from "@/lib/store/analytics";
import { getDailyReport } from "@/lib/store/daily-report";
import { getMargins } from "@/lib/store/margins";
import { getHomeSnapshot } from "@/lib/store/home";
import { router, protectedProcedure } from "@/lib/trpc/init";

// superjson carries the Date fields; via the RSC caller these never serialize.
const dateRange = z.object({ start: z.date(), end: z.date() });

export const analyticsRouter = router({
  get: protectedProcedure
    .input(z.object({ range: dateRange, prev: dateRange, hourly: z.boolean() }))
    .query(({ input }) => getAnalytics(input.range, input.prev, input.hourly)),

  dailyReport: protectedProcedure
    .input(z.string().min(1))
    .query(({ input }) => getDailyReport(input)),

  margins: protectedProcedure.query(() => getMargins()),

  homeSnapshot: protectedProcedure.query(() => getHomeSnapshot()),
});
