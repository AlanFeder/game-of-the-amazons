# Game of the Amazons

A browser-based strategy game for two people sharing one screen. Move an Amazon like a chess queen, then shoot an arrow to block a square. The first player with no legal move loses.

The game supports mouse, touch, and keyboard. It saves completed turns in the current browser. The site is static and runs without a build step or backend.

## Run locally

From the repository root, run `python3 -m http.server 8000 --directory dist` and open [localhost:8000](http://localhost:8000). Run the test suite with `node --test`.

## Documentation

- [Gameplay and controls](docs/gameplay.md)
- [Architecture, rules API, and save format](docs/architecture.md)
- [Development, verification, and hosting](docs/development.md)
