// Structured documentation content for the in-app /docs guide. Kept as data so
// the page stays a thin renderer and the docs are easy to extend. Each section
// has an id (anchor), a title, an optional role note, and a list of blocks.

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: [string, string][] } // [term, definition]
  | { kind: "keys"; items: [string, string][] } // [key, action]
  | { kind: "tip"; text: string };

export type DocSection = {
  id: string;
  title: string;
  href?: string; // link to the actual page
  roles?: string; // who can use it
  intro: string;
  blocks: DocBlock[];
};

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    intro:
      "Fizz is your café operating system: take orders at the till, manage your menu and stock, track money in and out, and see exactly what's selling. This guide explains every page and the common things you'll do.",
    blocks: [
      {
        kind: "p",
        text: "Use the sidebar on the left to move between pages. On a phone, tap the ☰ menu in the top bar. What you can see depends on your role.",
      },
      {
        kind: "list",
        items: [
          ["Owner (admin)", "Full access to everything, including Team and Store settings."],
          ["Manager", "Everything except Team and Store settings."],
          ["Barista (staff)", "Day-to-day floor work: Till, Orders, Daily sales, Expenses."],
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    roles: "Everyone",
    intro: "Your home screen — a quick snapshot of the café and shortcuts to every page.",
    blocks: [
      {
        kind: "list",
        items: [
          ["Hero tile", "Today's opening hours and your store currency."],
          ["Stat tiles", "Timezone, currency, invoice prefix, and the next invoice number."],
          ["Action tiles", "One tap to jump to any page you have access to."],
        ],
      },
    ],
  },
  {
    id: "till",
    title: "Till (point of sale)",
    href: "/dashboard/till",
    roles: "Everyone",
    intro:
      "Where you ring up orders and take payment. The menu is on the left, the running order (the ticket) is on the right. It's built to be fast with a keyboard.",
    blocks: [
      { kind: "p", text: "To create a new order:" },
      {
        kind: "steps",
        items: [
          "Tap a category tab, then tap an item to add it to the ticket. Or just start typing to search the whole menu.",
          "If an item has sizes/options, pick one in the popup (or press 1–9).",
          "Adjust quantities with the + / − buttons on each ticket line, or remove a line with ✕.",
          "Choose the order type — Dine in, Takeaway, or Delivery — and optionally type a table or tab name.",
          "Press Charge (or F2) to take payment, or Save tab (F4) to hold the order open.",
        ],
      },
      { kind: "p", text: "Taking payment:" },
      {
        kind: "steps",
        items: [
          "In the payment sheet pick Cash, Card, or Online (or press C / K / O).",
          "Add a discount if needed. Tax (if your store has one) is shown automatically.",
          "For cash, type the amount the customer handed over — change is calculated for you. Quick-cash chips speed up common notes.",
          "Press Confirm (or Enter). A receipt summary appears; press New order (Enter) to start the next.",
        ],
      },
      {
        kind: "keys",
        items: [
          ["type", "Search the menu"],
          ["1–9", "Quick-add the first nine visible items"],
          ["F2 / Enter", "Open payment"],
          ["F4", "Save the order as an open tab"],
          ["⌘/Ctrl + ⌫", "Clear the whole ticket"],
          ["Esc", "Close a popup / clear search"],
        ],
      },
      {
        kind: "tip",
        text: "On a phone the order sits behind a 'View order' bar at the bottom — tap it to review and pay.",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders & open tabs",
    href: "/dashboard/orders",
    roles: "Everyone",
    intro:
      "Every saved tab and completed sale lives here. Use it to manage dine-in tabs and browse history.",
    blocks: [
      {
        kind: "list",
        items: [
          ["Open tabs", "Orders you saved but haven't settled yet — e.g. a table still eating."],
          ["Paid", "Completed, settled orders (read-only receipts)."],
          ["All", "Everything except voided orders."],
        ],
      },
      { kind: "p", text: "On an open tab you can:" },
      {
        kind: "steps",
        items: [
          "Edit — opens the tab back in the Till with all its items in the cart, so you can add more dishes without making a new order.",
          "Settle — opens the tab in the Till ready to take payment.",
          "Void (✕) — cancel an open tab that won't be paid.",
        ],
      },
      {
        kind: "tip",
        text: "Print KOT (or Reprint KOT) on any order opens a kitchen ticket — a clean slip listing items and quantities for the kitchen, with a Print button.",
      },
    ],
  },
  {
    id: "menu",
    title: "Menu",
    href: "/dashboard/menu",
    roles: "Owner, Manager",
    intro:
      "Build what you sell: categories (like Hot Coffee, Pastries), the items inside them, and variants (sizes/options). You can also publish a shareable public menu.",
    blocks: [
      { kind: "p", text: "To create a category:" },
      {
        kind: "steps",
        items: [
          "Click + New category.",
          "Give it a name and pick an emoji icon (any emoji works).",
          "Save. Reorder categories with the up/down arrows; drag them into the order you want on the floor.",
        ],
      },
      { kind: "p", text: "To create an item:" },
      {
        kind: "steps",
        items: [
          "Under a category, click Add item.",
          "Enter the name, an optional description, the Base price, and the Item cost (what it costs you to make — used for Margins).",
          "Add variants if the item comes in sizes (e.g. Small / Large), each with its own price and cost.",
          "Toggle Available off to hide an item from the till without deleting it.",
          "Save the item.",
        ],
      },
      {
        kind: "list",
        items: [
          ["Hide / Show", "Quickly toggle whether an item appears on the till."],
          ["Public Menu Settings", "Turn on a shareable web menu, set its link (slug), tagline, font, and accent colour."],
          ["Menu Sections", "Choose which categories appear on the public menu."],
        ],
      },
      {
        kind: "tip",
        text: "Setting an Item cost here is what powers the Margins page — the live margin preview shows your profit % as you type.",
      },
    ],
  },
  {
    id: "sales",
    title: "Daily sales",
    href: "/dashboard/sales",
    roles: "Everyone",
    intro:
      "Record the day's total takings split by payment type. Useful for a quick end-of-day cash-up even outside the till.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Pick the sale date.",
          "Enter the Cash, Online, and Credit amounts for the day.",
          "Save — the row appears in the table with a running total. Admins/managers can delete entries.",
        ],
      },
    ],
  },
  {
    id: "expenses",
    title: "Expenses",
    href: "/dashboard/expenses",
    roles: "Everyone",
    intro: "Track every cost — stock, rent, payroll, supplies, and more.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Click Record expense.",
          "Pick the date and a category (Inventory, Rent, Utilities, Payroll, etc.).",
          "Enter the amount, how it was paid, and optionally a description and vendor.",
          "Save. Expenses feed into your net profit on the Analytics page.",
        ],
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    href: "/dashboard/inventory",
    roles: "Owner, Manager",
    intro:
      "Track stock on hand for every ingredient and supply, with cost and reorder levels.",
    blocks: [
      { kind: "p", text: "To add a stock item:" },
      {
        kind: "steps",
        items: [
          "Click Add item.",
          "Enter the name, an optional SKU, a category, and the unit it's measured in (each, g, kg, ml, L, pack…).",
          "Set the current quantity on hand, a reorder level (when to restock), and the cost per unit.",
          "Save.",
        ],
      },
      { kind: "p", text: "To change a stock level, use Adjust on an item and pick a movement type:" },
      {
        kind: "list",
        items: [
          ["Received", "New stock arrived — adds to the count."],
          ["Waste / loss", "Spoiled or thrown away — removes from the count."],
          ["Used / sold", "Consumed in service — removes from the count."],
          ["Recount", "Set the exact count after a manual stocktake."],
        ],
      },
      {
        kind: "tip",
        text: "Items at or below their reorder level are flagged Low so you know what to buy.",
      },
    ],
  },
  {
    id: "margins",
    title: "Margins",
    href: "/dashboard/margins",
    roles: "Owner, Manager",
    intro:
      "See how much profit each menu item makes. Margin = price − cost. Set item costs on the Menu page.",
    blocks: [
      {
        kind: "list",
        items: [
          ["Summary cards", "Revenue, cost of goods, gross profit, and average menu margin."],
          ["Margin %", "Colour-coded: green is healthy (65%+), cyan is thin, red is losing money."],
          ["Sold & Profit", "Realized units and profit from actually-paid orders."],
          ["Sort", "By most profit, best margin %, best sellers, price, or name."],
          ["Missing a cost", "Filter to items without a cost so you can fix them on the Menu."],
        ],
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    href: "/dashboard/analytics",
    roles: "Owner, Manager",
    intro:
      "Your business at a glance over any time window — revenue, profit, and what's selling.",
    blocks: [
      { kind: "p", text: "Pick a time range at the top:" },
      {
        kind: "list",
        items: [
          ["Presets", "Today, Yesterday, This/Last week, This/Last month, This year."],
          ["Custom range", "Choose any From and To dates, then Apply."],
        ],
      },
      {
        kind: "list",
        items: [
          ["KPIs", "Revenue, orders, average order, net profit, tax, discounts, expenses — each with a ▲/▼ change vs the previous period."],
          ["Revenue trend", "Switch between Candles, Line, Area, and Bars."],
          ["Candles", "A stock-market view: each candle shows the order-value range for that hour/day — green when order values rose, red when they fell."],
          ["Breakdowns", "Sales by payment method, order type, and category, plus your top-selling items."],
        ],
      },
    ],
  },
  {
    id: "team",
    title: "Team",
    href: "/dashboard/team",
    roles: "Owner only",
    intro: "Add staff and set their roles. (This area is being built.)",
    blocks: [
      {
        kind: "list",
        items: [
          ["Owner (admin)", "Full access."],
          ["Manager", "Runs the floor and back office; no Team or Store settings."],
          ["Barista (staff)", "Till, Orders, Daily sales, Expenses."],
        ],
      },
    ],
  },
  {
    id: "store",
    title: "Store settings",
    href: "/dashboard/store",
    roles: "Owner only",
    intro: "Your café's profile and how bills are numbered and taxed.",
    blocks: [
      {
        kind: "list",
        items: [
          ["Store profile", "Name, contact, address, tax ID, timezone, and currency."],
          ["Opening hours", "Store-local open and close times shown on the dashboard."],
          ["Tax", "Name your tax (GST/VAT), set the rate %, and whether menu prices already include it. This is applied to every bill at the till."],
          ["Invoice & order numbering", "Prefixes, formats, and the next sequence numbers for receipts and orders."],
        ],
      },
    ],
  },
];

// Common how-to recipes surfaced at the top for quick access.
export const QUICK_RECIPES: { title: string; href: string; steps: string[] }[] = [
  {
    title: "Take a new order",
    href: "/dashboard/till",
    steps: [
      "Open the Till.",
      "Tap or search items to add them to the ticket.",
      "Pick the order type and press Charge (F2).",
      "Choose a payment method and confirm.",
    ],
  },
  {
    title: "Save a dine-in tab",
    href: "/dashboard/till",
    steps: [
      "Ring the dishes at the Till.",
      "Type a table name and press Save tab (F4).",
      "Find it later under Orders → Open tabs to add more or settle.",
    ],
  },
  {
    title: "Add a menu item",
    href: "/dashboard/menu",
    steps: [
      "Open the Menu.",
      "Under a category, click Add item.",
      "Enter name, price, and cost; add variants if needed.",
      "Save.",
    ],
  },
  {
    title: "Add a category",
    href: "/dashboard/menu",
    steps: [
      "Open the Menu.",
      "Click + New category.",
      "Name it and pick an emoji icon.",
      "Save, then reorder as you like.",
    ],
  },
];
