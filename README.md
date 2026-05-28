# Replace My Wife: Home Memory

Hackathon MVP for a funny but useful “home memory” assistant. It has two modes:

- `Capture`: paste notes or upload PDFs/images/audio/text. Gemini extracts useful home facts, then XTrace stores them.
- `Retrieve`: ask questions. A tiny LangGraph flow searches XTrace first and only answers from retrieved memory. Empty memory means the assistant says it does not know.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Fill `.env` with:

- `XTRACE_API_KEY`
- `XTRACE_ORG_ID`
- `GEMINI_API_KEY`
- optional model overrides: `GEMINI_AGENT_MODEL`, `GEMINI_EXTRACT_MODEL`

Never commit `.env`.

## Demo Flow

1. Start the app at `http://localhost:3000`.
2. Ask a question like: “How do I clean or reset the Aroma kettle?” The app should say it does not know yet.
3. Ingest the demo appliance manual, curated kettle notes, and medical-record sample:

```bash
npm run ingest:demo
```

4. Ask the same question again. Now the answer should cite the captured manual memory.

For the fastest live seed, use:

```bash
npm run ingest:quick-demo
```

## Docker

```bash
docker compose up --build
```

Expose port `3000` through Tailscale or a reverse proxy for the live demo.

## Notes

The XTrace SDK requires both an API key and an org id. The Gemini integration uses the server-side REST API so keys never ship to the browser.
