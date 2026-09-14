import { runDeploy } from "../deploy.js";
import { PreviewRemoteConfig } from "../config.js";

const question = process.argv[2] ?? "Should ShadowPoll ship its New Moon milestone?";
const seed = process.argv[3];
const staticProofServerPort = process.env.PROOF_SERVER_PORT
  ? Number(process.env.PROOF_SERVER_PORT)
  : undefined;

await runDeploy(new PreviewRemoteConfig(), question, staticProofServerPort, seed);
