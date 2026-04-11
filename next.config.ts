import type { NextConfig } from "next";
import nextPwa from "next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_APP_VARIANT === "manager",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    const securityHeaders = [
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (process.env.NODE_ENV !== "development") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    if (process.env.NEXT_PUBLIC_APP_VARIANT !== "manager") {
      return [];
    }

    return [
      {
        source: "/",
        destination: "/manager/login",
        permanent: false,
      },
      {
        source: "/login",
        destination: "/manager/login",
        permanent: false,
      },
      {
        source: "/change-password",
        destination: "/manager/login",
        permanent: false,
      },
    ];
  },
};

export default withPWA(nextConfig);
