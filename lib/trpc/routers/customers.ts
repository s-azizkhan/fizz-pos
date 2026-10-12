import { customerBook } from "@/lib/store/customers";
import { router, featureGate, protectedProcedure } from "@/lib/trpc/init";

// Whole router belongs to one feature; switched off = every call refuses.
const gate = featureGate("customers");

export const customersRouter = router({
  // Whole book in one go; the POS searches it on the device.
  book: protectedProcedure.use(gate).query(() => customerBook()),
});
