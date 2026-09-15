/**
 * Browser shim for `isomorphic-ws`, aliased in via next.config.ts.
 *
 * `@midnight-ntwrk/midnight-js-indexer-public-data-provider` does
 * `import * as ws from "isomorphic-ws"` and references `ws.WebSocket` as a
 * named export. That package's own browser build only exports a default
 * (the global `WebSocket`), which Turbopack's static ESM analysis rejects
 * at build time — this shim re-exports the real browser WebSocket under
 * both names so that import keeps working unmodified.
 */
export const WebSocket = globalThis.WebSocket;
export default WebSocket;
