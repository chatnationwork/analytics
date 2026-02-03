import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/agent-status",
        destination: "/team-management/agent-status",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
