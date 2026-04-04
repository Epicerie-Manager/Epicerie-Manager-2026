import type { NextConfig } from "next";
import nextPwa from "next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
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
