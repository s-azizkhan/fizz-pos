import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Agentation } from "agentation";
import Toaster from "@/components/fizz/Toaster";
import TrpcProvider from "@/lib/trpc/Provider";
import SplashScreen from "@/components/fizz/pwa/SplashScreen";
import NetworkStatus from "@/components/fizz/pwa/NetworkStatus";
import ServiceWorkerRegistrar from "@/components/fizz/pwa/ServiceWorkerRegistrar";

// Must match the device list in scripts/generate-pwa-assets.mts — iOS only
// uses a startup image whose media query matches the device exactly.
const IOS_DEVICES: [number, number, number][] = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3], [390, 844, 3],
  [393, 852, 3], [402, 874, 3], [414, 896, 2], [414, 896, 3], [428, 926, 3],
  [430, 932, 3], [440, 956, 3], [768, 1024, 2], [834, 1194, 2], [1024, 1366, 2],
];

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

// Pixel face for the wordmark only.
const wordmark = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Fizz — The Café Operating System",
  description:
    "Fizz runs the till and tracks every ingredient — so cafés stop guessing. POS, inventory, and margins in one effervescent live loop.",
  applicationName: "Fizz",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    title: "Fizz",
    capable: true,
    // Lets the ink background run under the status bar in standalone.
    statusBarStyle: "black-translucent",
    startupImage: IOS_DEVICES.map(([w, h, dpr]) => ({
      url: `/splash/${w}x${h}@${dpr}x.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr})`,
    })),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0E1116",
  // Let the app paint under the iOS notch / home indicator; components pad
  // themselves back with env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (LanguageTool, Grammarly, …) stamp attributes onto
    // <html> before React hydrates — suppress the mismatch they cause.
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${wordmark.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-ink text-cream">
        <TrpcProvider>{children}</TrpcProvider>
        <Toaster />
        <NetworkStatus />
        <SplashScreen />
        <ServiceWorkerRegistrar />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
