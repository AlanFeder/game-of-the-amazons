import { SIZE, replay } from "./rules.mjs";

/** Origin-scoped key shared with legacy 10×10 saves. */
export const SAVE_KEY = "game-table.amazons.v1";
/**
 * Decode a stored match and validate its turns by replaying them.
 * Version 1 saves always use the original 10×10 opening.
 * @param {string | null} raw Value returned by Storage.getItem.
 * @returns {{moves: import("./rules.mjs").Turn[], position: import("./rules.mjs").Position, undoDepth: number}}
 * @throws {Error} If the save cannot be parsed, recognized, or replayed.
 */
export function restore(raw) {
  if (raw === null) return { moves: [], position: replay([]), undoDepth: 0 };
  const data = JSON.parse(raw);
  const size = data?.version === 1 ? SIZE : data?.size;
  if (![1, 2, 3].includes(data?.version) || ![8, 10].includes(size) || !Array.isArray(data.moves) || data.moves.length > size * size) {
    throw new Error("Unrecognized saved game");
  }
  const limit = Math.min(2, data.moves.length);
  const undoDepth = data.version < 3 ? limit : data.undoDepth;
  if (!Number.isInteger(undoDepth) || undoDepth < 0 || undoDepth > limit) {
    throw new Error("Invalid takeback count");
  }
  return { moves: data.moves, undoDepth, position: replay(data.moves, size) };
}
/**
 * Persist committed history only. The current position is derived on load.
 * @param {import("./rules.mjs").Turn[]} moves
 * @param {number} size Board width.
 * @param {number} undoDepth Number of consecutive completed turns eligible for undo.
 * @returns {string}
 */
export function serialize(moves, size = SIZE, undoDepth = Math.min(2, moves.length)) {
  return JSON.stringify({ version: 3, size, moves, undoDepth });
}
