# Running Claude on Amazon Bedrock

ShipGate runs Claude through Amazon Bedrock, inside AWS. The model provider is
swappable behind a single interface in `packages/platform/llm`:

- `LLM_PROVIDER=bedrock` (default, deployment): Claude via Amazon Bedrock,
  authenticated with the AWS credential chain (an IAM role). **No model provider
  API key is used or stored on the deployed path.**
- `LLM_PROVIDER=anthropic` (local development): the direct Anthropic API using
  `ANTHROPIC_API_KEY`. When no real key is present, a deterministic offline mock
  keeps the pipeline runnable.

Both providers expose the same `complete()` and `completeStructured(schema)`
surface, so no agent code changes when switching.

> Scope: Bedrock secures **inference** only. Per client tokens, pulled diffs and
> logs, screenshots, and the history store remain our responsibility and must
> stay protected regardless of the model provider.

## Configuration

All values are read from the environment (see `.env.example`) and surfaced in
`config/client.ts` (`platformConfig`). Nothing is hardcoded in agent logic.

| Variable | Purpose |
| --- | --- |
| `LLM_PROVIDER` | `bedrock` (default) or `anthropic`. |
| `AWS_REGION` | Region for Bedrock and other AWS calls, e.g. `us-east-1`. |
| `BEDROCK_MODEL_ID` | Claude model or inference profile id (see below). |
| `BEDROCK_VPC_ENDPOINT` | Optional. Private endpoint for Bedrock traffic. |
| `KMS_KEY_ID` | Customer managed KMS key id/ARN for encryption at rest. |
| `ANTHROPIC_API_KEY` | Local development only (with `LLM_PROVIDER=anthropic`). |

## Region selection

Pick the region with `AWS_REGION`. Choose a region that:

1. Has the Claude model you intend to use enabled (model availability varies by
   region and changes over time).
2. Meets your data residency requirements. With Bedrock, inference stays inside
   AWS in the region you choose.

Bedrock also offers cross region inference profiles (geo and global) for higher
throughput. If you use one, set `BEDROCK_MODEL_ID` to the profile id rather than
the in region model id, and grant the IAM permissions for every destination
region the profile can route to.

## Verify the model id before pinning

Claude model identifiers and regional availability on Bedrock change over time.
**Verify the current values against the live AWS Bedrock console and the
Anthropic documentation before pinning**, then set `BEDROCK_MODEL_ID`.

- In region model ids look like `anthropic.claude-sonnet-4-6`.
- Cross region inference profile ids are prefixed by geo, for example
  `us.anthropic.claude-sonnet-4-6`, `eu.anthropic.claude-sonnet-4-6`, or
  `global.anthropic.claude-...`.

To confirm what is available in your account and region:

```bash
# List foundation models offered in the region
aws bedrock list-foundation-models --region "$AWS_REGION" \
  --by-provider anthropic --query 'modelSummaries[].modelId'

# List the inference profiles you can call
aws bedrock list-inference-profiles --region "$AWS_REGION" \
  --query 'inferenceProfileSummaries[].inferenceProfileId'
```

Cross check the chosen id against the model detail page in the Bedrock console
and the Anthropic docs, then set `BEDROCK_MODEL_ID` to the verified value. Do not
hardcode it anywhere in agent code.

## Minimal IAM policy

The deployment role may invoke only the specific Bedrock actions the app needs.
Scope the resource to the exact model and, if used, inference profile ARNs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeClaude",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:<region>::foundation-model/anthropic.claude-<version>",
        "arn:aws:bedrock:<region>:<account-id>:inference-profile/<profile-id>"
      ]
    }
  ]
}
```

Notes:

- Drop `InvokeModelWithResponseStream` if you do not stream responses.
- If you use a cross region inference profile, include the `foundation-model`
  ARN for every destination region the profile can route to, in addition to the
  `inference-profile` ARN.
- Grant nothing beyond invoke. The role does not need model management,
  provisioning, or marketplace permissions.

## KMS configuration (encryption at rest)

The database and any artifact storage are encrypted at rest with a customer
managed AWS KMS key. Record the key in config via `KMS_KEY_ID` so the chosen key
is documented and discoverable.

- Provision a customer managed key (CMK) and apply it to the database (for
  example, the RDS instance storage encryption key) and to any artifact bucket
  (S3 default encryption with the same CMK).
- Put the key id or ARN in `KMS_KEY_ID`.
- If the application itself reads or writes KMS encrypted artifacts directly,
  grant the deployment role the minimal data key permissions on that key:

```json
{
  "Sid": "ArtifactDataKeys",
  "Effect": "Allow",
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "arn:aws:kms:<region>:<account-id>:key/<key-id>"
}
```

Storage services (RDS, S3) use the CMK through their own service integration and
do not require the application role to hold these permissions for at rest
encryption alone.

## Private networking (VPC endpoint)

To keep Bedrock traffic off the public internet, create an interface VPC
endpoint for `com.amazonaws.<region>.bedrock-runtime` and set
`BEDROCK_VPC_ENDPOINT` to its URL. The client routes calls through it. When
unset, the SDK uses the default regional endpoint.

```
BEDROCK_VPC_ENDPOINT=https://vpce-xxxxxxxx-xxxxxxxx.bedrock-runtime.<region>.vpce.amazonaws.com
```

Pair the endpoint with a security group and an endpoint policy that allow only
the required Bedrock actions, consistent with the IAM policy above.

## Auditability

Each agent run is assigned a correlation id that is threaded onto every model
call. The Bedrock provider reports the AWS request id (recorded in CloudTrail)
back to the agent, which writes both the correlation id and the request id into
the history store `Event` for that step. This lets you line up an Event with the
exact CloudTrail `InvokeModel` entry for the same call.

## A note on certifications

AWS provides certified infrastructure. That covers the infrastructure, not our
application. Do not claim that ShipGate is SOC 2, ISO, or HIPAA certified until
independently audited. We may state that ShipGate runs on Amazon Bedrock and
inside AWS.
