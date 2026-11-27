# Game of the Amazons

A shared-screen, two-player version of Amazons for the web. White moves first. Select a piece, move it like a chess queen, then shoot an arrow along a clear line. Arrows block their squares permanently. A player with no legal move loses.

## Run locally

With Python 3 installed, run `python3 -m http.server 8000 --directory dist` from this directory and open http://localhost:8000. The game also works on any static HTTPS host. It uses no build step, external fonts, or runtime dependencies.

Run the automated rules and persistence tests with `node --test`.

## Controls and storage

Click or tap to select pieces, destinations, and shots. On a keyboard, Tab to the board, use the arrow keys to navigate, and press Enter or Space to select. Escape backs up one step before the shot. Each completed turn is saved to this browser's local storage. Reloading restores the last completed turn.

## Architecture

The files in `dist/` are the deployable site. The pure rules in `rules.mjs` generate legal targets, validate complete turns, and determine the winner. A turn contains three square indices (`from`, `to`, and `arrow`), numbered from 0 at a10 to 99 at j1. The UI in `game.mjs` holds the provisional selection separately. The versioned move history in `save.mjs` is replayed through the same rules on load.

A future AI can run in a Web Worker and return a complete turn. A mobile app can bundle the same board and rules. Separate-device multiplayer would require a match service to store turns, assign players, and validate each move against the current position.
