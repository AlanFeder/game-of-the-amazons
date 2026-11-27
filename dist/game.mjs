import { BLOCK, SIZE, applyTurn, coordinate, initialPosition, movedBoard, targets, winner } from "./rules.mjs";
import { restore, serialize, SAVE_KEY } from "./save.mjs";

const $ = selector => document.querySelector(selector);
const cap = s => s[0].toUpperCase() + s.slice(1);
const boardEl = $("#board");
const cells = [];
const steps = [...document.querySelectorAll(".steps li")];
const dialog = $("#dialog");
// Committed state advances only when a shot lands. The two selections below
// can be backed out independently and never appear in the saved match.
let position = initialPosition();
let moves = [];
let from = null;
let to = null;
let focused = 93;

/** Restore the last committed match, or leave a fresh board after a read failure. */
function load() {
  try {
    ({ moves, position } = restore(localStorage.getItem(SAVE_KEY)));
  } catch {
    $("#save-note").textContent = "The saved match could not be loaded. A fresh board is ready.";
  }
}

/** Save without interrupting play when browser storage is unavailable. */
function save() {
  try {
    localStorage.setItem(SAVE_KEY, serialize(moves));
    $("#save-note").textContent = "";
  } catch {
    $("#save-note").textContent = "Browser storage is unavailable. Keep this tab open to continue your match.";
  }
}

/**
 * Derive the display state from the committed position and current selection.
 * Stages 0, 1, and 2 correspond to choosing a piece, destination, and shot.
 * @returns {{board: import("./rules.mjs").Cell[], legal: number[], stage: number}}
 */
function view() {
  const board = to === null ? position.board : movedBoard(position.board, from, to);
  const legal = from === null ? [] : targets(board, to ?? from);
  return { board, legal, stage: from === null ? 0 : to === null ? 1 : 2 };
}

/** Keep exactly one board square in the tab order. @param {number} index */
function setFocus(index) {
  cells[focused].tabIndex = -1;
  focused = index;
  cells[focused].tabIndex = 0;
}

/** Update the existing square buttons to preserve keyboard focus during play. */
function draw() {
  const { board, legal, stage } = view();
  const won = winner(position);
  const player = cap(won ?? position.side);
  const title = won ? player + " wins" : player + " to play";
  cells.forEach((cell, i) => {
    const piece = board[i];
    const own = !won && stage < 2 && piece === position.side;
    const selected = i === (to ?? from);
    const target = !won && legal.includes(i);
    cell.classList.toggle("selectable", own);
    cell.classList.toggle("selected", selected);
    cell.classList.toggle("target", target);
    cell.classList.toggle("shot-target", target && stage === 2);
    cell.innerHTML = piece ? '<svg class="piece ' + piece + '" aria-hidden="true"><use href="assets/pieces.svg#' + piece + '"/></svg>'
      : target ? '<span class="target-mark"></span>' : "";
    const description = piece === BLOCK ? "blocked" : piece ? piece + " Amazon" : "empty";
    cell.setAttribute("aria-label", [coordinate(i), description, selected && "selected",
      target && (stage === 2 ? "legal shot" : "legal destination")].filter(Boolean).join(", "));
  });
  $("#turn-title").textContent = title;
  $(".turn-label > span").textContent = won ? "Game over" : "Current turn";
  $("#turn-number").textContent = "Turn " + String(moves.length + (won ? 0 : 1)).padStart(2, "0");
  $("#turn-piece use").setAttribute("href", "assets/pieces.svg#" + (won ?? position.side));
  steps.forEach((step, n) => {
    step.classList.toggle("active", stage === n);
    step.classList.toggle("done", stage > n);
    step.querySelector(".step-num").textContent = n < stage ? "✓" : n + 1;
    if (stage === n) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  $(".steps ol").hidden = !!won;
  $("#change").hidden = !!won || stage === 0;
  $("#change").textContent = stage === 2 ? "Change destination" : "Cancel selection";
  $("#outcome").hidden = !won;
  if (won) $("#outcome p").textContent = cap(position.side) + " has no legal moves.";
  $("#announce").textContent = won ? title + ". " + $("#outcome p").textContent
    : title + ". " + steps[stage].querySelector("strong").textContent + ".";
}

/** Render completed turns in order and scroll the history to the latest one. */
function drawHistory() {
  $("#count").textContent = moves.length + (moves.length === 1 ? " move" : " moves");
  $("#empty-history").hidden = moves.length > 0;
  const log = $("#log");
  log.hidden = !moves.length;
  log.replaceChildren();
  moves.forEach((move, index) => {
    const item = document.createElement("li");
    const side = index % 2 ? "Black" : "White";
    item.innerHTML = '<span>' + (index + 1) + '.</span><b><i class="dot ' + (index % 2 ? "dark" : "light") +
      '"></i>' + side + '</b><span>' + coordinate(move.from) + '–' + coordinate(move.to) + ' · ↗ ' + coordinate(move.arrow) + '</span>';
    item.setAttribute("aria-label", "Turn " + (index + 1) + ", " + side + " from " + coordinate(move.from) + " to " + coordinate(move.to) + ", arrow to " + coordinate(move.arrow));
    log.append(item);
  });
  log.scrollTop = log.scrollHeight;
}

/** Apply a square selection for the current stage. @param {number} i */
function choose(i) {
  if (winner(position)) return;
  const { legal } = view();
  if (to === null && position.board[i] === position.side) {
    from = from === i ? null : i;
  } else if (legal.includes(i)) {
    if (to === null) to = i;
    else {
      const move = { from, to, arrow: i };
      position = applyTurn(position, move);
      moves.push(move);
      from = to = null;
      save();
      drawHistory();
    }
  } else return;
  draw();
}

/** Back up one provisional selection without changing the committed match. */
function back() {
  if (to !== null) to = null;
  else from = null;
  draw();
}

// Build the buttons once. Native button activation handles both keyboard
// selection and pointer input. Arrow keys move focus within the board.
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement("button");
  cell.type = "button";
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  cell.className = "cell " + ((x + y) % 2 ? "sage" : "pale");
  cell.style.setProperty("--gx", -x * 37 + "px");
  cell.style.setProperty("--gy", -y * 41 + "px");
  cell.tabIndex = i === focused ? 0 : -1;
  cell.addEventListener("focus", () => setFocus(i));
  cell.addEventListener("click", () => { setFocus(i); choose(i); });
  cell.addEventListener("keydown", event => {
    const direction = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
    if (event.key === "Escape") { event.preventDefault(); back(); return; }
    if (!direction) return;
    event.preventDefault();
    const clamp = v => Math.min(SIZE - 1, Math.max(v, 0));
    cells[clamp(y + direction[0]) * SIZE + clamp(x + direction[1])].focus();
  });
  cells.push(cell);
  boardEl.append(cell);
}
for (let i = 0; i < SIZE; i++) {
  for (const [selector, label] of [[".ranks", SIZE - i], [".files", String.fromCharCode(97 + i)]]) {
    const span = document.createElement("span");
    span.textContent = label;
    $(selector).append(span);
  }
}
/** Replace the saved match with a fresh opening and reset the board tab stop. */
function reset() {
  position = initialPosition();
  moves = [];
  from = to = null;
  setFocus(93);
  save(); draw(); drawHistory();
}
/** Open a modal with trusted, caller-supplied markup. @param {string} content */
function openDialog(content) {
  $("#dialog-content").innerHTML = content;
  dialog.showModal();
}
$("#guide").onclick = () => openDialog('<h2 id="dialog-title">How to play</h2><p>White goes first. Trap the other player by leaving all four of their Amazons without a legal move.</p><ol><li><b>Select</b> one of your Amazons.</li><li><b>Move</b> any distance horizontally, vertically, or diagonally through empty squares.</li><li><b>Shoot</b> an arrow from the new square along any clear line. Its landing square is blocked for the rest of the game. You can shoot back through, or onto, the square you left.</li></ol><p>Before shooting, use <b>Change destination</b> to revise your move. The first player unable to move loses.</p><p><b>Keyboard:</b> Use arrow keys to explore the board, Enter or Space to select, and Escape to go back one step.</p>');
$("#new-game").onclick = () => {
  if (!moves.length && from === null) { reset(); cells[focused].focus(); return; }
  openDialog('<h2 id="dialog-title">Start a new game?</h2><p>This will replace the current match. White will take the first turn.</p><div class="actions"><button class="new" id="keep">Keep playing</button><button class="new primary" id="restart">New game</button></div>');
  $("#keep").onclick = () => dialog.close();
  $("#restart").onclick = () => { dialog.close(); reset(); cells[focused].focus(); };
};
$("#close").onclick = () => dialog.close();
dialog.onclick = event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
};
$("#rematch").onclick = () => { reset(); cells[focused].focus(); };
$("#change").onclick = () => { const i = from; back(); cells[i].focus(); };

load(); draw(); drawHistory();
