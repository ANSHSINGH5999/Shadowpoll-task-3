import { runDeploy } from "../deploy.js";
import { PreviewRemoteConfig } from "../config.js";

const question = process.argv[2] ?? "Should ShadowPoll ship its New Moon milestone?";

await runDeploy(new PreviewRemoteConfig(), question);
