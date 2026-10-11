"use client";

import { usePathname, useRouter } from "next/navigation";
import { MonthPicker } from "@/components/fizz/ui/DatePicker";
import { currentMonth } from "@/lib/store/date-range";

// Month picker that drives the ?month=YYYY-MM search param.
export default function MonthFilter({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <MonthPicker
      value={month}
      max={currentMonth()}
      onChange={(m) => router.push(`${pathname}?month=${m}`)}
    />
  );
}
