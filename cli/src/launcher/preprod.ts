import { runDeploy } from "../deploy.js";
import { PreprodRemoteConfig } from "../config.js";

const question = process.argv[2] ?? "Should ShadowPoll ship its New Moon milestone?";
const staticProofServerPort = process.env.PROOF_SERVER_PORT
  ? Number(process.env.PROOF_SERVER_PORT)
  : undefined;

await runDeploy(new PreprodRemoteConfig(), question, staticProofServerPort);
