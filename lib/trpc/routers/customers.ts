import { customerBook } from "@/lib/store/customers";
import { router, protectedProcedure } from "@/lib/trpc/init";

export const customersRouter = router({
  // Whole book in one go; the POS searches it on the device.
  book: protectedProcedure.query(() => customerBook()),
});
