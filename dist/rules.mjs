/**
 * Pure rules for both board sizes. Square indices run row-major from the top left. A null cell is empty, and an arrow blocks all subsequent rays.
 * @typedef {"white" | "black"} Side
 * @typedef {Side | "arrow" | null} Cell
 * @typedef {{ size: number, board: Cell[], side: Side }} Position
 * @typedef {{ from: number, to: number, arrow: number }} Turn
 */
export const SIZE = 10;
// Black starts opposite White after a half turn around the center.
const openings = new Map([[10, [60, 69, 93, 96]], [8, [48, 60, 47]]]);
export const BLOCK = "arrow";
/** @param {Side} side @returns {Side} */
export const otherSide = side => side === "white" ? "black" : "white";
/** Format a valid square index as board notation. @param {number} i @returns {string} */
export const coordinate = (i, size = SIZE) => String.fromCharCode(97 + i % size) + (size - Math.floor(i / size));

/** Create an independent board in the standard opening. @returns {Position} */
export function initialPosition(size = SIZE) {
  const white = openings.get(size);
  if (!white) throw new Error("Unknown board size");
  const board = Array(size * size).fill(null);
  for (const i of white) {
    board[i] = "white";
    board[board.length - 1 - i] = "black";
  }
  return { size, board, side: "white" };
}

/**
 * Trace eight queen rays from an origin. The first occupied square on each ray
 * ends it. The same traversal works for both movement and arrows.
 * @param {Cell[]} board
 * @param {number} origin
 * @returns {number[]} Reachable empty squares.
 */
export function targets(board, origin) {
  const size = Math.sqrt(board.length);
  const result = [];
  if (!Number.isInteger(origin) || origin < 0 || origin >= board.length) return result;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dy && !dx) continue;
      let x = origin % size + dx;
      let y = Math.floor(origin / size) + dy;
      while (x >= 0 && x < size && y >= 0 && y < size) {
        const i = y * size + x;
        if (board[i] !== null) break;
        result.push(i);
        x += dx;
        y += dy;
      }
    }
  }
  return result;
}

/**
 * Copy a board with a piece relocated. Callers supply a validated destination.
 * @param {Cell[]} board
 * @param {number} from
 * @param {number} to
 * @returns {Cell[]}
 */
export function movedBoard(board, from, to) {
  const moved = board.slice();
  moved[to] = board[from];
  moved[from] = null;
  return moved;
}

/**
 * Validate a complete turn and return a new position. Trace the shot on the
 * relocated board so it can pass through or land on the vacated square.
 * @param {Position} position
 * @param {Turn} move
 * @returns {Position}
 * @throws {Error} If the piece, destination, or shot is illegal.
 */
export function applyTurn(position, move) {
  const { from, to, arrow } = move;
  if (position.board[from] !== position.side || !targets(position.board, from).includes(to)) {
    throw new Error("Illegal Amazon move");
  }
  const board = movedBoard(position.board, from, to);
  if (!targets(board, to).includes(arrow)) throw new Error("Illegal arrow");
  board[arrow] = BLOCK;
  return { size: position.size, board, side: otherSide(position.side) };
}

/**
 * A legal relocation always leaves at least one shot back to the origin,
 * so checking for a reachable destination is sufficient.
 * @param {Position} position
 * @returns {Side | null} The opposing side if the active side is trapped.
 */
export function winner(position) {
  return position.board.some((piece, i) => piece === position.side && targets(position.board, i).length)
    ? null : otherSide(position.side);
}

/**
 * Reconstruct a position from complete turns in chronological order.
 * @param {Turn[]} moves
 * @returns {Position}
 * @throws {Error} If a turn is illegal in its reconstructed position.
 */
export function replay(moves, size = SIZE) {
  return moves.reduce(applyTurn, initialPosition(size));
}
