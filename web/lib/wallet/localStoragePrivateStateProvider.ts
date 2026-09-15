import type {
  ContractAddress,
  SigningKey,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from "@midnight-ntwrk/midnight-js-types";

const STORAGE_PREFIX = "shadowpoll:private-state:";

/**
 * Recursively replaces Uint8Array values with a JSON-safe marker (base64),
 * so the voter's secret key round-trips through localStorage correctly.
 */
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { __uint8array__: btoa(String.fromCharCode(...value)) };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__uint8array__" in value) {
    const b64 = (value as { __uint8array__: string }).__uint8array__;
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }
  return value;
}

const encode = <T>(value: T): string => JSON.stringify(value, replacer);
const decode = <T>(value: string): T => JSON.parse(value, reviver) as T;

/**
 * A private-state provider backed by the browser's localStorage, scoped per
 * contract address. This is what makes ShadowPoll's "one vote per identity"
 * story real in a browser: the voter's secret key is generated once and
 * persisted locally (never sent anywhere), so reloading the page reuses the
 * same identity instead of minting a fresh one that could vote again.
 */
export function localStoragePrivateStateProvider<
  PSI extends PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> {
  let contractAddress: ContractAddress | null = null;

  const requireContractAddress = (): ContractAddress => {
    if (contractAddress === null) {
      throw new Error("Contract address not set. Call setContractAddress() before accessing private state.");
    }
    return contractAddress;
  };

  const stateKey = (address: ContractAddress, id: PSI) => `${STORAGE_PREFIX}${address}:state:${String(id)}`;
  const signingKeyKey = (address: ContractAddress) => `${STORAGE_PREFIX}${address}:signing-key`;

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    set(key: PSI, state: PS): Promise<void> {
      localStorage.setItem(stateKey(requireContractAddress(), key), encode(state));
      return Promise.resolve();
    },
    get(key: PSI): Promise<PS | null> {
      const raw = localStorage.getItem(stateKey(requireContractAddress(), key));
      return Promise.resolve(raw ? decode<PS>(raw) : null);
    },
    remove(key: PSI): Promise<void> {
      localStorage.removeItem(stateKey(requireContractAddress(), key));
      return Promise.resolve();
    },
    clear(): Promise<void> {
      const address = requireContractAddress();
      const prefix = `${STORAGE_PREFIX}${address}:state:`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) localStorage.removeItem(k);
      }
      return Promise.resolve();
    },
    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      localStorage.setItem(signingKeyKey(address), encode(signingKey));
      return Promise.resolve();
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      const raw = localStorage.getItem(signingKeyKey(address));
      return Promise.resolve(raw ? decode<SigningKey>(raw) : null);
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      localStorage.removeItem(signingKeyKey(address));
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX) && k.endsWith(":signing-key")) localStorage.removeItem(k);
      }
      return Promise.resolve();
    },
    exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      void options;
      const address = requireContractAddress();
      const prefix = `${STORAGE_PREFIX}${address}:state:`;
      const states: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) {
          states[k.slice(prefix.length)] = localStorage.getItem(k) ?? "";
        }
      }
      return Promise.resolve({
        format: "midnight-private-state-export",
        encryptedPayload: encode({ contractAddress: address, states }),
        salt: "local-storage-private-state-provider",
      });
    },
    importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const address = requireContractAddress();
      const conflictStrategy = options?.conflictStrategy ?? "error";
      const payload = decode<{ states?: Record<string, string> }>(exportData.encryptedPayload);
      const states = payload.states ?? {};
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [rawStateId, serialized] of Object.entries(states)) {
        const key = stateKey(address, rawStateId as PSI);
        const hasExisting = localStorage.getItem(key) !== null;
        if (hasExisting) {
          if (conflictStrategy === "skip") {
            skipped += 1;
            continue;
          }
          if (conflictStrategy === "error") {
            return Promise.reject(new Error(`Private state conflict for '${rawStateId}'`));
          }
          overwritten += 1;
        } else {
          imported += 1;
        }
        localStorage.setItem(key, serialized);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
    exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      void options;
      const keys: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX) && k.endsWith(":signing-key")) {
          keys[k] = localStorage.getItem(k) ?? "";
        }
      }
      return Promise.resolve({
        format: "midnight-signing-key-export",
        encryptedPayload: encode({ keys }),
        salt: "local-storage-signing-key-provider",
      });
    },
    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const conflictStrategy = options?.conflictStrategy ?? "error";
      const payload = decode<{ keys?: Record<string, string> }>(exportData.encryptedPayload);
      const keys = payload.keys ?? {};
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [key, serialized] of Object.entries(keys)) {
        const hasExisting = localStorage.getItem(key) !== null;
        if (hasExisting) {
          if (conflictStrategy === "skip") {
            skipped += 1;
            continue;
          }
          if (conflictStrategy === "error") {
            return Promise.reject(new Error(`Signing key conflict for '${key}'`));
          }
          overwritten += 1;
        } else {
          imported += 1;
        }
        localStorage.setItem(key, serialized);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
}
