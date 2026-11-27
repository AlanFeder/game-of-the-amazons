import { replay } from "./rules.mjs";

export const SAVE_KEY = "game-table.amazons.v1";
export function restore(raw) {
  if (raw === null) return { moves: [], position: replay([]) };
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.moves) || data.moves.length > 92) {
    throw new Error("Unrecognized saved game");
  }
  return { moves: data.moves, position: replay(data.moves) };
}
export function serialize(moves) {
  return JSON.stringify({ version: 1, moves });
}
