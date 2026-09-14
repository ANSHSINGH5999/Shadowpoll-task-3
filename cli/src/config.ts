import path from "node:path";
import {
  type EnvironmentConfiguration,
  RemoteTestEnvironment,
  type TestEnvironment,
} from "@midnight-ntwrk/testkit-js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Logger } from "pino";

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  getEnvironment(logger: Logger): TestEnvironment;
}

export const currentDir = path.resolve(new URL(import.meta.url).pathname, "..");

class RemoteEnvironment extends RemoteTestEnvironment {
  constructor(
    logger: Logger,
    private readonly networkId: "preview" | "preprod",
    private readonly endpoints: Omit<EnvironmentConfiguration, "walletNetworkId" | "networkId" | "proofServer">,
  ) {
    super(logger);
  }

  private getProofServerUrl(): string {
    const container = this.proofServerContainer as { getUrl(): string } | undefined;
    if (!container) {
      throw new Error("Proof server container is not available.");
    }
    return container.getUrl();
  }

  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: this.networkId,
      networkId: this.networkId,
      proofServer: this.getProofServerUrl(),
      ...this.endpoints,
    };
  }
}

export class PreviewRemoteConfig implements Config {
  privateStateStoreName = "shadowpoll-private-state";
  logDir = path.resolve(currentDir, "..", "logs", "preview-remote", `${new Date().toISOString()}.log`);
  zkConfigPath = path.resolve(currentDir, "..", "..", "contract", "src", "managed", "shadow_poll");

  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId("preview");
    return new RemoteEnvironment(logger, "preview", {
      indexer: "https://indexer.preview.midnight.network/api/v4/graphql",
      indexerWS: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
      node: "https://rpc.preview.midnight.network",
      nodeWS: "wss://rpc.preview.midnight.network",
      faucet: "https://midnight-tmnight-preview.nethermind.dev/",
    });
  }
}

export class PreprodRemoteConfig implements Config {
  privateStateStoreName = "shadowpoll-private-state";
  logDir = path.resolve(currentDir, "..", "logs", "preprod-remote", `${new Date().toISOString()}.log`);
  zkConfigPath = path.resolve(currentDir, "..", "..", "contract", "src", "managed", "shadow_poll");

  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId("preprod");
    return new RemoteEnvironment(logger, "preprod", {
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
      indexerWS: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
      node: "https://rpc.preprod.midnight.network",
      nodeWS: "wss://rpc.preprod.midnight.network",
      faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
    });
  }
}
