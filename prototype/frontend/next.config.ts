import type { NextConfig } from "next";

function getCsp(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const connectSrc = new Set<string>([
    "'self'",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ]);

  try {
    const parsed = new URL(apiUrl);
    connectSrc.add(parsed.origin);
  } catch {
    // Ignore invalid URL
  }

  if (isDev) {
    connectSrc.add("ws://localhost:3000");
    connectSrc.add("ws://127.0.0.1:3000");
    connectSrc.add("http://localhost:3000");
    connectSrc.add("http://127.0.0.1:3000");
  }

  // Next.js client hydration and Recharts SVG rendering require 'unsafe-inline' for styles
  // 'unsafe-eval' is only allowed in local development for Fast Refresh / HMR tooling, never in production.
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": Array.from(connectSrc).filter(Boolean),
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  if (!isDev) {
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: getCsp() },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), browsing-topics=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
