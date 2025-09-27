# Migration from OpenAI to AWS Bedrock

## Overview

AWS Deploy AI has been updated to use AWS Bedrock instead of OpenAI for natural language processing and AI-powered deployment analysis. This change provides several benefits:

### Benefits of AWS Bedrock

1. **Better AWS Integration**: Native AWS service with seamless integration
2. **Enhanced Security**: Data stays within AWS infrastructure
3. **Cost Efficiency**: Pay-per-use pricing model without subscription fees
4. **Regional Control**: Use models in specific AWS regions for compliance
5. **Access to Claude 3**: Advanced AI capabilities from Anthropic

## Changes Made

### 1. Code Changes

#### Package Dependencies

- **Removed**: `openai` package
- **Added**: `@aws-sdk/client-bedrock-runtime`

#### AI Interpreter Service (`src/services/ai-interpreter.ts`)

- Replaced OpenAI client with AWS Bedrock Runtime client
- Updated to use Claude 3 Sonnet model (`anthropic.claude-3-sonnet-20240229-v1:0`)
- Implemented custom JSON parsing instead of OpenAI function calling
- Added `invokeClaudeModel()` method for Bedrock API calls

#### Main Server (`src/main.ts`)

- Updated error messages to reference Bedrock instead of OpenAI

### 2. Configuration Changes

#### Environment Variables

**Removed:**

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

**Added:**

```bash
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1
```

#### Required Permissions

The AWS IAM user/role now needs:

- `bedrock:InvokeModel` permission
- Access to Claude 3 models in AWS Bedrock

### 3. Documentation Updates

#### Updated Files:

- `README.md` - Changed badges, setup instructions, and references
- `docs/deployment-guide.md` - Replaced OpenAI setup with Bedrock configuration
- `docs/api-reference.md` - Updated error codes and examples
- `docs/development-guide.md` - Changed development setup and code examples
- `mcp-server/.env.example` - Updated environment template

## Migration Steps

### For Existing Users

1. **Enable Bedrock Access**

   ```bash
   # No additional packages needed - uses existing AWS credentials
   # Ensure your AWS region supports Bedrock
   ```

2. **Update Environment Variables**

   ```bash
   # Remove old variables
   unset OPENAI_API_KEY
   unset OPENAI_MODEL

   # Add new variables
   export BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"
   export BEDROCK_REGION="us-east-1"
   ```

3. **Update IAM Permissions**
   Add this policy to your IAM user/role:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["bedrock:InvokeModel"],
         "Resource": [
           "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
         ]
       }
     ]
   }
   ```

4. **Request Model Access**
   - Go to AWS Bedrock console
   - Navigate to "Model access"
   - Request access to Anthropic Claude 3 models if not already granted

### For New Users

Follow the updated setup instructions in the README.md - no OpenAI account or API key required.

## Technical Implementation Details

### Model Invocation

AWS Bedrock uses a different API structure compared to OpenAI:

**OpenAI (Previous):**

```typescript
const completion = await this.openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
  functions: [functionSchema],
  function_call: { name: 'function_name' },
})
```

**AWS Bedrock (Current):**

```typescript
const command = new InvokeModelCommand({
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  body: JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  }),
})
```

### JSON Response Parsing

Since Bedrock doesn't support OpenAI's function calling feature, we now:

1. Include JSON schema in the system prompt
2. Parse JSON from the text response using regex
3. Validate the parsed structure

### Error Handling

Updated error codes:

- `OPENAI_RATE_LIMIT` → `BEDROCK_RATE_LIMIT`
- Better error messages for Bedrock-specific issues

## Available Models

AWS Bedrock supports multiple Claude 3 models:

| Model ID                                  | Description          | Use Case                                           |
| ----------------------------------------- | -------------------- | -------------------------------------------------- |
| `anthropic.claude-3-sonnet-20240229-v1:0` | Balanced performance | **Default** - Good balance of speed and capability |
| `anthropic.claude-3-haiku-20240307-v1:0`  | Fast and lightweight | Cost optimization, simple tasks                    |
| `anthropic.claude-3-opus-20240229-v1:0`   | Most capable         | Complex reasoning, highest quality                 |

### Changing Models

Update the `BEDROCK_MODEL_ID` environment variable:

```bash
export BEDROCK_MODEL_ID="anthropic.claude-3-haiku-20240307-v1:0"  # For faster/cheaper
export BEDROCK_MODEL_ID="anthropic.claude-3-opus-20240229-v1:0"   # For better quality
```

## Cost Comparison

### OpenAI (Previous)

- Monthly subscription fees
- Per-token pricing
- Requires separate billing account

### AWS Bedrock (Current)

- Pay-per-use pricing only
- No subscription fees
- Integrated with AWS billing
- Typical costs: $0.003 per 1K input tokens, $0.015 per 1K output tokens

## Regional Availability

AWS Bedrock is available in these regions:

- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)
- ap-southeast-1 (Singapore)
- ap-northeast-1 (Tokyo)

Choose the region closest to your users for best performance.

## Troubleshooting

### Common Issues

1. **Model Access Denied**

   - Request access through Bedrock console
   - Ensure proper IAM permissions

2. **Region Availability**

   - Check if Bedrock is available in your region
   - Update `BEDROCK_REGION` environment variable

3. **Rate Limits**
   - Bedrock has default quotas
   - Request quota increases through AWS Support

### Support

- AWS Support for Bedrock-related issues
- GitHub Issues for application-specific problems

---

This migration enhances AWS Deploy AI with better AWS integration while maintaining all existing functionality. The natural language deployment capabilities remain the same, now powered by Claude 3 instead of GPT-4.
