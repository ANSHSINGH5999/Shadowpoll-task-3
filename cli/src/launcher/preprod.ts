import { runDeploy } from "../deploy.js";
import { PreprodRemoteConfig } from "../config.js";

const question = process.argv[2] ?? "Should ShadowPoll ship its New Moon milestone?";

await runDeploy(new PreprodRemoteConfig(), question);
