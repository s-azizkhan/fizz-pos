// One-off: freeze today's auto item order (veg → non-veg → untagged, then
// cheapest, then name) into menu_items.position, so switching the menu to
// manual drag order moves nothing. Run ONCE per DB:
//   npx tsx --env-file=.env scripts/backfill-item-positions.mts
// ponytail: re-running overwrites any drag order since — it's not a migration.
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

const res = await db.execute(sql`
  UPDATE menu_items m SET position = r.rn
  FROM (
    SELECT id, row_number() OVER (
      PARTITION BY category_id
      ORDER BY CASE diet WHEN 'veg' THEN 0 WHEN 'nonveg' THEN 1 ELSE 2 END,
               price, name
    ) AS rn
    FROM menu_items WHERE deleted_at IS NULL
  ) r
  WHERE m.id = r.id
`);
console.log(`Backfilled ${res.count} item positions.`);
process.exit(0);
