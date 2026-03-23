# AI Engine Core

AI Engine Core is a reusable AI processing service exposed through HTTP.
It is designed to run as an external service that other systems consume via API.

## Purpose

- Keep AI decision logic centralized
- Expose stable processing through POST /process
- Return a predictable payload for downstream systems

## API

### POST /process

Request body:

```json
{
  "message": "quero comprar cimento",
  "from": "5511999999999"
}
```

Response body:

```json
{
  "intent": "sales",
  "response": "Perfeito, posso te ajudar com planos e valores...",
  "score": 0.92
}
```

## Local Development

Install dependencies:

```bash
npm install
```

Run API in development:

```bash
npm run dev
```

Default URL:

- http://localhost:3001

## Build And Start

Build:

```bash
npm run build
```

Run compiled app:

```bash
npm start
```

## Project Structure

```text
src/
  api/
  core/
  memory/
  modules/
```

## Git Release Baseline

- Stable baseline: v1.0.0
- Commit target: AI Engine Core v1 - stable
- Main branch protected in GitHub

## Notes

- Keep this version frozen as production baseline
- Evolve only through new tagged versions
