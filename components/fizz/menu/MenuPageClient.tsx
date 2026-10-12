"use client";

import { useState } from "react";
import MenuManager from "@/components/fizz/menu/MenuManager";
import PublicMenuModal from "@/components/fizz/menu/PublicMenuModal";
import PublicMenuSectionsModal from "@/components/fizz/menu/PublicMenuSectionsModal";
import NewCategoryModal from "@/components/fizz/menu/NewCategoryModal";
import ExportMenuPdfModal from "@/components/fizz/menu/ExportMenuPdfModal";
import MenuQrModal from "@/components/fizz/menu/MenuQrModal";
import type { MenuCategoryWithItems } from "@/lib/store/menu";
import type { RecipeIngredient } from "@/lib/store/recipe";
import type { OrderSettings, RecipeComponent, Store } from "@/lib/db/schema";
import { GlobeIcon, LayersIcon, PlusIcon, PrinterIcon, QrIcon } from "@/components/fizz/dashboard/icons";

export default function MenuPageClient({
  store,
  categories,
  orderSettings,
  ingredients,
  recipes,
  origin,
}: {
  store: Store;
  categories: MenuCategoryWithItems[];
  orderSettings: OrderSettings;
  ingredients: RecipeIngredient[];
  recipes: Record<string, RecipeComponent[]>;
  origin: string;
}) {
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isPublicSectionsOpen, setIsPublicSectionsOpen] = useState(false);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

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
      <p className="mt-3 max-w-[60ch] text-base text-steam sm:text-lg">
        Build your categories and items, reorder them, and publish a shareable
        public menu.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 text-sm sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 sm:text-base">
        <button
          onClick={() => setIsNewCategoryOpen(true)}
          className="inline-flex items-center justify-center gap-2 col-span-2 rounded-fizz bg-fizz px-5 py-3 font-semibold text-ink transition-transform hover:scale-105 sm:py-2.5"
        >
          <PlusIcon className="h-4 w-4 shrink-0" />
          New category
        </button>
        <button
          onClick={() => setIsPublicMenuOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-fizz border border-fizz bg-fizz/10 px-3 py-3 font-semibold text-fizz transition-colors hover:bg-fizz/20 sm:px-5 sm:py-2.5"
        >
          <GlobeIcon className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">Public menu</span>
          <span className="hidden sm:inline">Public Menu Settings</span>
        </button>
        <button
          onClick={() => setIsPublicSectionsOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-fizz border border-fizz/50 px-3 py-3 font-semibold text-fizz transition-colors hover:border-fizz hover:bg-fizz/10 sm:px-5 sm:py-2.5"
        >
          <LayersIcon className="h-4 w-4 shrink-0" />
          Menu Sections
        </button>
        <button
          onClick={() => setIsQrOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-3 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz sm:px-5 sm:py-2.5"
        >
          <QrIcon className="h-4 w-4 shrink-0" />
          Menu QR code
        </button>
        <button
          onClick={() => setIsExportPdfOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-3 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz sm:px-5 sm:py-2.5"
        >
          <PrinterIcon className="h-4 w-4 shrink-0" />
          Printable PDF
        </button>
      </div>

      <div className="mt-6 sm:mt-10">
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
        settings={orderSettings}
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
      <MenuQrModal
        storeName={store.name}
        url={`${origin}/m/${store.menuSlug ?? ""}`}
        slug={store.menuSlug ?? ""}
        published={store.menuPublished}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />
      <ExportMenuPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
      />
    </div>
  );
}
