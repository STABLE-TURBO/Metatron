# Metatron

<img width="500" height="500" alt="Design sans titre" src="https://github.com/user-attachments/assets/6b8c36d2-deee-4184-8534-28b24d848e64" />


A stepwise, security-focused code generator CLI that forces an LLM to produce **one small verified step at a time**.

This project is intentionally minimal: a single Node.js script ([`metatron.js`](metatron.js)) that:
- asks you what you want to build,
- repeatedly requests the **next single critical step**,
- enforces a strict response format (**EXPLANATION / CODE / VERIFICATION**),
- accumulates generated code until you stop.

## What it does

When you run the CLI, it:
1. Prompts for your overall task (e.g. “PDF invoice generator from JSON cart”).
2. Calls an OpenAI-compatible chat-completions API (currently configured for X.AI).
3. Requires the model to respond *only* as:

```
EXPLANATION: ...
CODE: ...
VERIFICATION: ...
```

4. Parses those sections, appends the `CODE` snippet to a growing “full code” output, and appends the full step output to the running context so the next step has continuity.
5. On `stop`, prints the full accumulated code.

## Why this exists

Most “AI coding” workflows fail because they are:
- too big-bang (huge outputs you can’t validate),
- too unstructured (no consistent format),
- too light on verification (no security/standards references).

Metatron’s goal is to make generation **structured, incremental, and easier to audit**.

## Requirements

- Node.js 18+ (Node 20+ recommended)
- An API key for the configured provider (default: X.AI Grok)

## Setup

This repository currently has **no** `package.json`. Because [`metatron.js`](metatron.js) uses ESM `import` statements and depends on `node-fetch`, you’ll typically want to initialize a small Node project in this folder:

```bash
npm init -y
npm pkg set type=module
npm i node-fetch
```

Then provide your API key via environment variable (recommended) or paste it when prompted.

### Environment variable

- Windows (cmd.exe):

```bat
set GROK_API_KEY=your_key_here
```

- macOS/Linux:

```bash
export GROK_API_KEY=your_key_here
```

## Run

```bash
node metatron.js
```

You’ll see a prompt like:

- “Describe what you want to build…”
- Then step-by-step generation begins:
  - press **Enter** to request the next step
  - type **stop** to print the full generated code
  - type **quit** to exit

## Configuration

In [`metatron.js`](metatron.js):

- The model is configured via the `MODEL` constant (see [`MODEL`](metatron.js:14)).
- The API key is read from `process.env.GROK_API_KEY` or prompted interactively (see [`API_KEY`](metatron.js:13)).
- The endpoint is currently set to `https://api.x.ai/v1/chat/completions` (see [`grok()`](metatron.js:20)).

## Output format guarantees (and limits)

The system prompt forces the model to produce:
- a plain-English explanation of the step,
- the code for that single step,
- a verification hint (e.g., inline test/assertion + reference like OWASP/MDN/CVE).

If the model fails to follow the format, the parser will fall back to placeholder values, and the generated code for that step may be `// error` (see parsing in [`main()`](metatron.js:47)).

## Security notes

- **Secrets**: Your API key is used locally, but prompts and context are sent to the remote API provider. Don’t paste sensitive secrets or proprietary code unless you accept that risk.
- **Verification is guidance, not proof**: References in `VERIFICATION` help auditing, but you still must run tests, static analysis, and security review yourself.
- **Prompt injection**: If you feed untrusted text into the task/context, the model can be influenced. Treat external inputs as hostile.

## Roadmap (ideas)

- Write a `package.json` and lockfile for reproducible installs.
- Add provider configuration via environment variables (endpoint/model).
- Save steps + full code to files.
- Add a “verification gate” that requires you to confirm checks before continuing.
