import { SIZE, replay } from "./rules.mjs";

/** Origin-scoped key shared with legacy 10×10 saves. */
export const SAVE_KEY = "game-table.amazons.v1";
/**
 * Decode a stored match and validate its turns by replaying them.
 * Version 1 saves always use the original 10×10 opening.
 * @param {string | null} raw Value returned by Storage.getItem.
 * @returns {{moves: import("./rules.mjs").Turn[], position: import("./rules.mjs").Position}}
 * @throws {Error} If the save cannot be parsed, recognized, or replayed.
 */
export function restore(raw) {
  if (raw === null) return { moves: [], position: replay([]) };
  const data = JSON.parse(raw);
  const size = data?.version === 1 ? SIZE : data?.size;
  if (![1, 2].includes(data?.version) || ![8, 10].includes(size) || !Array.isArray(data.moves) || data.moves.length > size * size) {
    throw new Error("Unrecognized saved game");
  }
  return { moves: data.moves, position: replay(data.moves, size) };
}
/**
 * Persist committed history only. The current position is derived on load.
 * @param {import("./rules.mjs").Turn[]} moves
 * @returns {string}
 */
export function serialize(moves, size = SIZE) {
  return JSON.stringify({ version: 2, size, moves });
}
