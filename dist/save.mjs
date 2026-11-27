import { replay } from "./rules.mjs";

/** Origin-scoped key for the version 1 match. */
export const SAVE_KEY = "game-table.amazons.v1";
/**
 * Decode a stored match and validate its turns by replaying them.
 * There are 92 empty squares at the start, and each turn consumes one.
 * @param {string | null} raw Value returned by Storage.getItem.
 * @returns {{moves: import("./rules.mjs").Turn[], position: import("./rules.mjs").Position}}
 * @throws {Error} If the save cannot be parsed, recognized, or replayed.
 */
export function restore(raw) {
  if (raw === null) return { moves: [], position: replay([]) };
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.moves) || data.moves.length > 92) {
    throw new Error("Unrecognized saved game");
  }
  return { moves: data.moves, position: replay(data.moves) };
}
/**
 * Persist committed history only. The current position is derived on load.
 * @param {import("./rules.mjs").Turn[]} moves
 * @returns {string}
 */
export function serialize(moves) {
  return JSON.stringify({ version: 1, moves });
}
