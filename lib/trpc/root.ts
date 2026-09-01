import { router } from "@/lib/trpc/init";
import { analyticsRouter } from "@/lib/trpc/routers/analytics";
import { authRouter } from "@/lib/trpc/routers/auth";
import { dailySalesRouter } from "@/lib/trpc/routers/dailySales";
import { expensesRouter } from "@/lib/trpc/routers/expenses";
import { inventoryRouter } from "@/lib/trpc/routers/inventory";
import { menuRouter } from "@/lib/trpc/routers/menu";
import { ordersRouter } from "@/lib/trpc/routers/orders";
import { recipeRouter } from "@/lib/trpc/routers/recipe";
import { teamRouter } from "@/lib/trpc/routers/team";
import { storeRouter } from "@/lib/trpc/routers/store";
import { waitlistRouter } from "@/lib/trpc/routers/waitlist";

export const appRouter = router({
  analytics: analyticsRouter,
  auth: authRouter,
  dailySales: dailySalesRouter,
  expenses: expensesRouter,
  inventory: inventoryRouter,
  menu: menuRouter,
  orders: ordersRouter,
  recipe: recipeRouter,
  store: storeRouter,
  team: teamRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
