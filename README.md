# Cards

A custom single-player solitaire card game built with TypeScript. The goal is to move all 52 cards onto four Foundation piles (one per suit, Ace through King). A unique scoring system rewards finishing with fewer draws from the score pile.

Playable in the browser via a Phaser 3 UI, or directly in the terminal via a CLI runner.

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
