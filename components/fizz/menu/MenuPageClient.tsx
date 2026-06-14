"use client";

import { useState } from "react";
import MenuManager from "@/components/fizz/menu/MenuManager";
import PublicMenuModal from "@/components/fizz/menu/PublicMenuModal";
import PublicMenuSectionsModal from "@/components/fizz/menu/PublicMenuSectionsModal";
import type { MenuCategoryWithItems } from "@/lib/store/menu";
import type { Store } from "@/lib/db/schema";

export default function MenuPageClient({
  store,
  categories,
  origin,
}: {
  store: Store;
  categories: MenuCategoryWithItems[];
  origin: string;
}) {
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isPublicSectionsOpen, setIsPublicSectionsOpen] = useState(false);

  const shapeKey = categories
    .map((c) => `${c.id}:${c.items.map((i) => i.id).join(",")}`)
    .join("|");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Floor
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Menu
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Build your categories and items, reorder them, and publish a shareable
        public menu.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => setIsPublicMenuOpen(true)}
          className="rounded-fizz border border-fizz bg-fizz/10 px-5 py-2.5 font-semibold text-fizz transition-colors hover:bg-fizz/20"
        >
          Public Menu Settings
        </button>
        <button
          onClick={() => setIsPublicSectionsOpen(true)}
          className="rounded-fizz border border-fizz/50 px-5 py-2.5 font-semibold text-fizz transition-colors hover:border-fizz hover:bg-fizz/10"
        >
          Menu Sections
        </button>
      </div>

      <div className="mt-10">
        <MenuManager key={shapeKey} categories={categories} currency={store.currency} />
      </div>

      <PublicMenuModal
        store={store}
        origin={origin}
        isOpen={isPublicMenuOpen}
        onClose={() => setIsPublicMenuOpen(false)}
      />
      <PublicMenuSectionsModal
        categories={categories}
        isOpen={isPublicSectionsOpen}
        onClose={() => setIsPublicSectionsOpen(false)}
      />
    </div>
  );
}
