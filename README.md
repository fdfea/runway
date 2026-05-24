# Runway

A custom single-player solitaire card game built with TypeScript and Phaser. The goal is to move all cards onto the four Foundation piles with the lowest score possible. Playable in a browser or terminal. 

---

<img width="1566" height="879" alt="runway-screenshot" src="https://github.com/user-attachments/assets/c82f7233-ab6f-4cbb-9701-fd2bb0a3c7eb" />

---

## Project Structure

```
cards/
├── engine/   # TypeScript game logic library — card/pile data structures,
│             # move validation, scoring, and a text-based CLI runner
└── ui/       # Browser game built with Phaser 3 and Vite — drag-and-drop
              # gameplay, animations, sound, and a rules overlay
```

The UI consumes the engine as a local npm package. The engine must be compiled before the UI can build or run.

The code in engine/ was built by hand without the assistance of AI code generation. The code in ui/ was built with the assistance of Claude Sonnet 4.6 and OpenCode. 

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

---

## Setup

Install dependencies for both packages:

```bash
cd engine && npm install
cd ../ui && npm install
```

---

## Running

### Browser UI

Build the engine first, then start the Vite dev server:

```bash
cd engine && npm run build
cd ../ui && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### CLI

```bash
cd engine && npm start
```

### Tests

```bash
cd engine && npm test
```
