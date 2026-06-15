"use client";

import { useState } from "react";
import MenuManager from "@/components/fizz/menu/MenuManager";
import PublicMenuModal from "@/components/fizz/menu/PublicMenuModal";
import PublicMenuSectionsModal from "@/components/fizz/menu/PublicMenuSectionsModal";
import NewCategoryModal from "@/components/fizz/menu/NewCategoryModal";
import ExportMenuPdfModal from "@/components/fizz/menu/ExportMenuPdfModal";
import type { MenuCategoryWithItems } from "@/lib/store/menu";
import type { RecipeIngredient } from "@/lib/store/recipe";
import type { RecipeComponent, Store } from "@/lib/db/schema";

export default function MenuPageClient({
  store,
  categories,
  ingredients,
  recipes,
  origin,
}: {
  store: Store;
  categories: MenuCategoryWithItems[];
  ingredients: RecipeIngredient[];
  recipes: Record<string, RecipeComponent[]>;
  origin: string;
}) {
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isPublicSectionsOpen, setIsPublicSectionsOpen] = useState(false);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  const shapeKey = categories
    .map((c) => `${c.id}:${c.items.map((i) => i.id).join(",")}`)
    .join("|");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
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
          onClick={() => setIsNewCategoryOpen(true)}
          className="rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105"
        >
          + New category
        </button>
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
        <button
          onClick={() => setIsExportPdfOpen(true)}
          className="rounded-fizz border border-ink-line px-5 py-2.5 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
        >
          Printable PDF
        </button>
      </div>

      <div className="mt-10">
        <MenuManager
          key={shapeKey}
          categories={categories}
          currency={store.currency}
          ingredients={ingredients}
          recipes={recipes}
        />
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
      <NewCategoryModal
        isOpen={isNewCategoryOpen}
        onClose={() => setIsNewCategoryOpen(false)}
      />
      <ExportMenuPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
      />
    </div>
  );
}
