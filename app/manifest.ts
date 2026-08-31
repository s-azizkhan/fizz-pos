import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fizz — The Café Operating System",
    short_name: "Fizz",
    description:
      "Run the till, track every ingredient, know your margins — one live loop.",
    // Staff open the app to work, not to read the marketing page.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E1116",
    theme_color: "#0E1116",
    categories: ["business", "food", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Open the till", short_name: "Till", url: "/dashboard/till" },
      { name: "Orders", short_name: "Orders", url: "/dashboard/orders" },
      { name: "Record an expense", short_name: "Expense", url: "/dashboard/expenses" },
    ],
  };
}
