/**
 * Bedrock smoke test — verify that real Claude calls work through Amazon Bedrock.
 *
 *   pnpm bedrock:smoke
 *   pnpm bedrock:smoke "Reply with a haiku about regression tests."
 *
 * This exercises the same public @qa/llm path the agents use. It refuses to run
 * unless the deployed-style config is present (LLM_PROVIDER=bedrock, AWS_REGION,
 * BEDROCK_MODEL_ID), so it never silently falls back to the offline mock.
 *
 * Authentication uses the standard AWS credential chain (an IAM role in
 * deployment, a local profile/SSO in development). No model provider API key.
 */
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function main() {
  // Import after dotenv so config + the provider singleton see the env.
  const { platformConfig } = await import("@qa/config/client");
  const { Llm } = await import("@qa/llm");

  const prompt =
    process.argv[2] ??
    'Reply with exactly: {"ok":true,"provider":"bedrock"} and nothing else.';

  console.log("Bedrock smoke test");
  console.log("==================");
  console.log(`  LLM_PROVIDER         ${platformConfig.provider}`);
  console.log(`  AWS_REGION           ${platformConfig.awsRegion ?? "(unset)"}`);
  console.log(`  BEDROCK_MODEL_ID     ${platformConfig.bedrockModelId ?? "(unset)"}`);
  console.log(
    `  BEDROCK_VPC_ENDPOINT ${platformConfig.bedrockVpcEndpoint ?? "(default endpoint)"}`,
  );
  console.log(`  KMS_KEY_ID           ${platformConfig.kmsKeyId ?? "(unset)"}`);
  console.log("");

  // Preflight: only proceed when this would actually hit Bedrock.
  if (platformConfig.provider !== "bedrock") {
    fail(
      `LLM_PROVIDER is "${platformConfig.provider}", not "bedrock". ` +
        "Set LLM_PROVIDER=bedrock to test real Claude calls on Bedrock.",
    );
  }
  if (!platformConfig.awsRegion) {
    fail("AWS_REGION is unset. Set it to a region where your Claude model is enabled.");
  }
  if (!platformConfig.bedrockModelId) {
    fail(
      "BEDROCK_MODEL_ID is unset. Set it to a verified Claude model or inference " +
        "profile id (see docs/bedrock.md to confirm the current id).",
    );
  }

  const llm = new Llm();
  if (llm.providerName !== "bedrock") {
    fail(
      `Resolved provider is "${llm.providerName}", not "bedrock". ` +
        "Check LLM_PROVIDER and AWS_REGION.",
    );
  }

  console.log(`→ Invoking ${platformConfig.bedrockModelId} ...\n`);

  let requestId: string | undefined;
  const started = Date.now();
  let text: string;
  try {
    text = await llm.complete({
      system: "You are a terse assistant. Follow instructions exactly.",
      user: prompt,
      maxTokens: 256,
      correlationId: `smoke-${Date.now()}`,
      onMeta: (m) => {
        requestId = m.requestId;
      },
    });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    console.error("✗ Bedrock call failed.\n");
    console.error(`  ${e.name ?? "Error"}: ${e.message ?? String(err)}\n`);
    // Common, actionable causes.
    const hint =
      /credential/i.test(e.message ?? "")
        ? "No AWS credentials resolved. Configure an IAM role, AWS_PROFILE, or `aws sso login`."
        : /AccessDenied|not authorized/i.test(e.message ?? "")
          ? "The IAM principal lacks bedrock:InvokeModel on this model. See the minimal policy in docs/bedrock.md."
          : /ValidationException|model identifier|inference profile/i.test(e.message ?? "")
            ? "BEDROCK_MODEL_ID may be wrong for this region, or the model needs access enabled in the Bedrock console."
            : "Verify region, model access (Bedrock console > Model access), and IAM permissions.";
    fail(hint);
  }

  const elapsedMs = Date.now() - started;
  console.log("✓ Claude responded via Amazon Bedrock\n");
  console.log("  Response:");
  console.log(
    text
      .split("\n")
      .map((l) => `    ${l}`)
      .join("\n"),
  );
  console.log("");
  console.log(`  AWS requestId   ${requestId ?? "(not reported)"}`);
  console.log(`  Latency         ${elapsedMs} ms`);
  console.log(
    "\n  The requestId above appears in CloudTrail for this InvokeModel call,",
  );
  console.log("  alongside the correlationId your agents record in the history store.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
