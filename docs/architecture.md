# Architecture

The runtime is a static site in `dist/`. HTML defines the board container and panels, CSS handles the responsive layout, and native JavaScript modules handle play. Local assets provide the piece silhouettes, icons, and board grain.

## Rules API

`rules.mjs` represents a position as `{ board, side }`. The board is a 100-element array of `null`, `"white"`, `"black"`, or `"arrow"` values. Indices are row-major from a10 (0) to j1 (99). A complete turn is `{ from, to, arrow }`, with each value a square index.

| Function | Contract |
| --- | --- |
| `initialPosition()` | Returns a fresh opening position with White active. |
| `targets(board, origin)` | Lists reachable empty squares along the eight queen directions. |
| `movedBoard(board, from, to)` | Copies the board and relocates a piece to an already validated destination. |
| `applyTurn(position, turn)` | Validates the active piece, destination, and shot, then returns a new position for the other side. Throws on illegal turns. |
| `winner(position)` | Returns the opposing side if the active side is trapped, or null during play. |
| `replay(turns)` | Applies complete turns in sequence from the standard opening. |

A shot is checked after moving the Amazon. This makes shooting back to the vacated square legal and guarantees a legal shot whenever a legal destination exists.

## UI and storage

`game.mjs` keeps the committed position and move history alongside provisional origin and destination selections. It derives highlights from the rules engine. Square buttons remain in the DOM during redraws to preserve keyboard focus. An aria-live status announces the current stage or winner.

`save.mjs` stores one match per browser origin under `game-table.amazons.v1`. An example payload is `{"version":1,"moves":[{"from":60,"to":61,"arrow":60}]}`. The loader parses the version and replays every move, using the result as the current position. Invalid or unreadable saves open a fresh board. A failed write leaves the in-memory match playable. Provisional selections are deliberately omitted.

## Extension points

A computer player can take a snapshot of the position in a Web Worker and propose a complete turn for validation by `applyTurn`. Android and iPad clients can bundle the web UI and rules. Play across separate devices would add a service that assigns sides, validates submitted turns against the current match revision, and persists the authoritative history.
