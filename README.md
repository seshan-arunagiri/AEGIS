<div align="center">
```text
 █████╗ ███████╗ ██████╗ ██╗███████╗
██╔══██╗██╔════╝██╔════╝ ██║██╔════╝
███████║█████╗  ██║  ███╗██║███████╗
██╔══██║██╔══╝  ██║   ██║██║╚════██║
██║  ██║███████╗╚██████╔╝██║███████║
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝
```

<h3>Enterprise-Grade Security Middleware for AI Agents</h3>

**Fast • Dual-Layer • Adversarially Hardened**

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.10-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-5.22.0-2D3748?logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/AI-Groq_Llama_3.3_70B-f55036" alt="Groq" />
    <img src="https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel" alt="Vercel" />
  </p>

  <p>
    <a href="https://aegis-6ist.vercel.app"><strong>Live Demo</strong></a> • 
    <a href="https://github.com/seshan-arunagiri/AEGIS"><strong>GitHub Repo</strong></a>
  </p>
</div>

## What is Aegis?

Aegis is an enterprise-grade security middleware designed to sit between your AI agents and Model Context Protocol (MCP) tool responses. As AI agents increasingly interact with external environments—fetching code, querying databases, or reading emails—they become vulnerable to **tool poisoning** and **indirect prompt injection**. 

To mitigate this, Aegis scans all incoming tool responses before they reach your AI model. It uses a dual-layer detection system: extremely fast Regex pattern matching combined with independent AI intent analysis (powered by Groq). The system calculates a combined risk score and makes an Allow/Block decision, ensuring malicious instructions are neutralized without halting agent workflows.

The foundational Regex engine uses **40 meticulously calibrated patterns** spread across **6 distinct threat categories**:
- `INSTRUCTION_OVERRIDE` (e.g. "ignore previous instructions")
- `SYSTEM_MANIPULATION` (e.g. "act as developer mode")
- `CREDENTIAL_EXFILTRATION` (e.g. API keys, auth tokens)
- `DESTRUCTIVE_COMMAND` (e.g. `rm -rf`, `DROP TABLE`)
- `SHELL_INJECTION` (e.g. curl/wget execution)
- `SUSPICIOUS_ENCODING` (e.g. obfuscated Base64 payloads)

---

## Key Features

- **Four Interactive Scan Modes:** Test the engine via Mock Scenarios, direct File Uploads, Public GitHub Repo scanning, or Raw Paste Text.
- **Dual-Layer Detection:** Combines deterministic Regex scanning with semantic AI Intent Analysis, providing clear reasoning and highlighting specifically flagged text.
- **CI Security Gate:** Built-in GitHub Actions workflow (`aegis-scan.yml`) that scans pull requests, blocks merges on high risk, and posts detailed scan results as a PR comment.
- **Comprehensive Audit Trail:** Full dashboard with logs and analytics storing historical scan metrics, original payloads, and sanitized responses.
- **Configurable Risk Engine:**
  - **Strict Mode:** Lowers the threshold for Medium/Critical threats.
  - **Learning Mode:** Logs threats but always allows responses through (non-blocking).
  - **Developer Mode:** Exposes raw regex latencies and pattern match rules in the UI.
  - **AI Verification:** Uses Groq's Llama 3.3 70B to reduce false positives on medium-risk hits.
  - **Intent Analysis:** Deep semantic analysis for obfuscated or zero-day intent.

---

## Architecture Lifecycle

1. **User/Agent Input:** An AI agent requests data from an external environment via an MCP tool.
2. **Aegis Middleware Interception:** Aegis intercepts the incoming tool response.
3. **Parallel Scanning:** The payload is processed simultaneously by the **Prompt Scanner** (Regex) and **AI Intent Analysis** (Groq API).
4. **Risk Engine:** Scores are normalized and combined to determine the final Threat Level (Safe, Low, Medium, Critical).
5. **Decision & Sanitization:** If the risk is Critical, the response is blocked entirely. If the risk is Medium, malicious spans are redacted/sanitized, and the clean payload is passed back to the agent.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16.2.10, React 19, TypeScript 5, Tailwind CSS v4, Shadcn UI, Framer Motion |
| **Database** | Prisma 5.22.0, PostgreSQL (hosted on Neon) |
| **AI / Verification** | Groq API (running `llama-3.3-70b-versatile` or equivalent) |
| **Infrastructure** | Vercel (Hosting), GitHub Actions (CI/CD) |

---

## Getting Started

To run Aegis locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/seshan-arunagiri/AEGIS.git
   cd AEGIS
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and configure the following variables:
   ```env
   DATABASE_URL="postgres://user:pass@host/dbname" # Your PostgreSQL connection string
   GROQ_API_KEY="gsk_..."                           # Required for AI Verification / Intent Analysis
   AEGIS_API_URL="http://localhost:3000"            # The base URL of your Aegis instance
   AEGIS_CI_TOKEN="your_secure_random_token"        # Required for authenticating GitHub Actions webhook
   ```

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Aegis will be running at `http://localhost:3000`.

---

## CI/CD Integration

Aegis ships with a powerful GitHub Actions workflow (`.github/workflows/aegis-scan.yml`) that acts as an automated security gate for your repositories. 

It intercepts code changes in Pull Requests and sends them to your deployed Aegis instance for scanning. If destructive commands or prompt injections are found in the PR, the workflow will fail the check and post a detailed threat analysis comment directly on the PR.

To use this, you must deploy your own Aegis instance and configure `GROQ_API_KEY` and `AEGIS_CI_TOKEN` as GitHub Repository Secrets.

---

## License

*No standard OSS license is currently set in this repository.*
