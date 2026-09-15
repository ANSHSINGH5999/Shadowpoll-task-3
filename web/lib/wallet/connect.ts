import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import semver from "semver";

// The Midnight DApp Connector API standard: wallets inject compatible
// instances under `window.midnight` (ambient type declared by the package
// itself in its globals.d.ts). We depend on @midnight-ntwrk/dapp-connector-api@4.x.
const COMPATIBLE_CONNECTOR_API_VERSION = "4.x";

function getFirstCompatibleWallet(): InitialAPI | undefined {
  if (typeof window === "undefined" || !window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === "object" &&
      "apiVersion" in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
}

const POLL_INTERVAL_MS = 150;
const WALLET_DETECT_TIMEOUT_MS = 3_000;
const CONNECT_TIMEOUT_MS = 15_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Waits for a compatible Midnight wallet extension (e.g. Lace) to appear on
 * `window.midnight`, then connects it to the given network. Every stage here
 * really happens — this is not a simulated progress bar.
 */
export async function connectToWallet(networkId: string): Promise<ConnectedAPI> {
  const deadline = Date.now() + WALLET_DETECT_TIMEOUT_MS;
  let initialAPI: InitialAPI | undefined;
  while (Date.now() < deadline) {
    initialAPI = getFirstCompatibleWallet();
    if (initialAPI) break;
    await delay(POLL_INTERVAL_MS);
  }
  if (!initialAPI) {
    throw new Error("No compatible Midnight wallet found. Is the Lace wallet extension installed and unlocked?");
  }

  const connectedAPI = await withTimeout(
    initialAPI.connect(networkId),
    CONNECT_TIMEOUT_MS,
    "Midnight wallet did not respond to the connection request in time.",
  );

  const status = await connectedAPI.getConnectionStatus();
  if (status.status !== "connected") {
    throw new Error("Wallet connection was not authorized.");
  }

  return connectedAPI;
}
