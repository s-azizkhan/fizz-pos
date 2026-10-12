import { z } from "zod";
import { getAnalytics } from "@/lib/store/analytics";
import { getDailyReport } from "@/lib/store/daily-report";
import { getMargins } from "@/lib/store/margins";
import { getHomeSnapshot } from "@/lib/store/home";
import { router, featureGate, protectedProcedure } from "@/lib/trpc/init";

// superjson carries the Date fields; via the RSC caller these never serialize.
const dateRange = z.object({ start: z.date(), end: z.date() });

export const analyticsRouter = router({
  get: protectedProcedure
    .use(featureGate("analytics"))
    .input(z.object({ range: dateRange, prev: dateRange, hourly: z.boolean() }))
    .query(({ input }) => getAnalytics(input.range, input.prev, input.hourly)),

  dailyReport: protectedProcedure
    .use(featureGate("report"))
    .input(
      z.object({
        currency: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .query(({ input }) => getDailyReport(input.currency, input.date)),

  margins: protectedProcedure.use(featureGate("margins")).query(() => getMargins()),

  homeSnapshot: protectedProcedure.query(() => getHomeSnapshot()),
});
