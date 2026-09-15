import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // See lib/wallet/isomorphic-ws-shim.ts — works around a named-export
      // mismatch between isomorphic-ws's browser build and how
      // @midnight-ntwrk/midnight-js-indexer-public-data-provider imports it.
      "isomorphic-ws": "./lib/wallet/isomorphic-ws-shim.ts",
    },
  },
};

export default nextConfig;
