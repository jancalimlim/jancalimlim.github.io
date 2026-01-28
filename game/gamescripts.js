const ICON = {
  "White_Pawn":"♙","White_Rook":"♖","White_Knight":"♘","White_Bishop":"♗","White_Queen":"♕","White_King":"♔",
  "Black_Pawn":"♟","Black_Rook":"♜","Black_Knight":"♞","Black_Bishop":"♝","Black_Queen":"♛","Black_King":"♚"
};

const files = ["a","b","c","d","e","f","g","h"];

function tileClass(r, c) {
  return (r + c) % 2 === 0 ? "light" : "dark";
}


function squareName(r, c) {
  return files[c] + (8 - r); 
}


const boardEl   = document.getElementById("board");
const turnEl    = document.getElementById("turnText");
const stateEl   = document.getElementById("stateText");
const msgEl     = document.getElementById("msg");
const resetBtn  = document.getElementById("resetBtn");
const whiteCaps = document.getElementById("whiteCaps");
const blackCaps = document.getElementById("blackCaps");

const helpBtn   = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");


let py = null;

let GAME = null;

let selected = null;

function render() {

  if (!GAME) return;

  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const btn = document.createElement("button");

      btn.className = "sq " + tileClass(r, c);

      const name = GAME.board[r][c];

      btn.textContent = name ? (ICON[name] || "?") : "";

      if (c === 0) {
        const rank = document.createElement("span");
        rank.className = "coord coord-rank";
        rank.textContent = String(8 - r);
        btn.appendChild(rank);
      }

      if (r === 7) {
        const file = document.createElement("span");
        file.className = "coord coord-file";
        file.textContent = files[c];
        btn.appendChild(file);
      }

      const sq = squareName(r, c);

      if (selected === sq) btn.classList.add("selected");

      btn.addEventListener("click", () => onSquareClick(sq));

      boardEl.appendChild(btn);
    }
  }

  turnEl.textContent  = GAME.turn;
  stateEl.textContent = GAME.game_state;

  const order = ["Pawn", "Rook", "Knight", "Bishop", "Queen", "King"];
  const W = { Pawn:"♙", Rook:"♖", Knight:"♘", Bishop:"♗", Queen:"♕", King:"♔" };
  const B = { Pawn:"♟", Rook:"♜", Knight:"♞", Bishop:"♝", Queen:"♛", King:"♚" };

  const chips = (icons, caps) =>
    order
      .map(k => `<span class="chip"><i>${icons[k]}</i><b>${caps[k]}</b></span>`)
      .join("");

  whiteCaps.innerHTML = `
    <div class="capsTitle">White Captures:</div>
    <div class="capChips">${chips(W, GAME.caps_white)}</div>
  `;

  blackCaps.innerHTML = `
    <div class="capsTitle">Black Captures:</div>
    <div class="capChips">${chips(B, GAME.caps_black)}</div>
  `;
}


async function onSquareClick(sq) {

  if (!GAME || GAME.game_state !== "Unfinished") return;

  if (!selected) {
    selected = sq;
    msgEl.textContent = "Selected " + sq + ". Now click a destination.";
    render();
    return;
  }

  if (selected === sq) {
    selected = null;
    msgEl.textContent = "Selection cleared.";
    render();
    return;
  }

  const json = await py.runPythonAsync(`py_move("${selected}", "${sq}")`);
  const result = JSON.parse(json);

  GAME = result.state;

  msgEl.textContent = result.message || (result.ok ? "Move applied." : "Illegal move.");

  selected = null;

  render();
}

async function getState() {

  const json = await py.runPythonAsync("py_state_json()");
  GAME = JSON.parse(json);
}


async function doReset() {

  await py.runPythonAsync("py_reset()");

  selected = null;
  msgEl.textContent = "New game.";

  await getState();
  render();
}
resetBtn.addEventListener("click", doReset);

helpBtn.addEventListener("click", () => {
  helpModal.hidden = false;
});

helpClose.addEventListener("click", () => {
  helpModal.hidden = true;
  helpBtn.focus(); 
});

helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) {
    helpModal.hidden = true;
    helpBtn.focus();
  }
});


window.addEventListener("keydown", (e) => {
  if (!helpModal.hidden && e.key === "Escape") {
    helpModal.hidden = true;
    helpBtn.focus();
  }
});


(async function start() {
  try {

    py = await loadPyodide();

    await py.runPythonAsync(PY_CODE);

    await getState();
    render();
  } catch (err) {
    console.error(err);
    msgEl.textContent = "Failed to load game engine. Check your internet connection for Pyodide.";
  }
})();


const PY_CODE = `
class OutOfBoundsError(Exception):
    pass

class Chess:
    def __init__(self):
        self._chess_board = \
            [
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
                [None, None, None, None, None, None, None, None],
            ]

        self._game_state = 'Unfinished'
        self._turn_tracker = 'WHITE_TURN'
        self._game_total_turns = 0
        self._white_total_turns = 0
        self._black_total_turns = 0
        self._won_with = None
        self._win_conditions = {"Pawn": 8, "Rook": 2, "Knight": 2, "Bishop": 2, "King": 1, "Queen": 1}
        self._black_captured_pieces = {"Total_Captures": 0,
                                       "Pawn": 0, "Rook": 0, "Knight": 0, "Bishop": 0, "King": 0, "Queen": 0}
        self._white_captured_pieces = {"Total_Captures": 0,
                                       "Pawn": 0, "Rook": 0, "Knight": 0, "Bishop": 0, "King": 0, "Queen": 0}

        self.place_pieces()

    def new_game(self):
        self.__init__()

    def place_pieces(self):
        letter_list = ["a", "b", "c", "d", "e", "f", "g", "h"]

        for each_column in range(8):
            self._chess_board[1][each_column] = Pawn(letter_list[each_column] + "7", "Black")

        for each_column in range(8):
            self._chess_board[6][each_column] = Pawn(letter_list[each_column] + "2", "White")

        self._chess_board[0][0] = Rook("a8", "Black")
        self._chess_board[0][1] = Knight("b8", "Black")
        self._chess_board[0][2] = Bishop("c8", "Black")
        self._chess_board[0][3] = Queen("d8", "Black")
        self._chess_board[0][4] = King("e8", "Black")
        self._chess_board[0][5] = Bishop("f8", "Black")
        self._chess_board[0][6] = Knight("g8", "Black")
        self._chess_board[0][7] = Rook("h8", "Black")

        self._chess_board[7][0] = Rook("a1", "White")
        self._chess_board[7][1] = Knight("b1", "White")
        self._chess_board[7][2] = Bishop("c1", "White")
        self._chess_board[7][3] = Queen("d1", "White")
        self._chess_board[7][4] = King("e1", "White")
        self._chess_board[7][5] = Bishop("f1", "White")
        self._chess_board[7][6] = Knight("g1", "White")
        self._chess_board[7][7] = Rook("h1", "White")

    def switch_players(self):
        if self._turn_tracker == "BLACK_TURN":
            self._black_total_turns += 1
            self._game_total_turns += 1
            self._turn_tracker = "WHITE_TURN"
        elif self._turn_tracker == "WHITE_TURN":
            self._white_total_turns += 1
            self._game_total_turns += 1
            self._turn_tracker = "BLACK_TURN"

    def rec_algebraic_notation_conversion(self, a_notation, column=0, column_list=None):
        if column_list is None:
            column_list = ["a", "b", "c", "d", "e", "f", "g", "h"]
        if column >= len(column_list):
            raise OutOfBoundsError("File must be a..h")
        if a_notation[0] == column_list[column]:
            row = 8 - int(a_notation[1])
            coordinate_tuple = (row, column)
            return coordinate_tuple
        return self.rec_algebraic_notation_conversion(a_notation, column + 1, column_list)

    def make_move(self, current_square, destination_square):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_piece = self._chess_board[current_row][current_column]
        capture_piece = self._chess_board[destination_row][destination_column]
        current_turn = self._turn_tracker

        if self._game_state in ('BLACK_WON', 'WHITE_WON'):
            return False
        if chess_piece is None:
            return False
        if current_turn == "BLACK_TURN" and chess_piece.get_color() != "Black":
            return False
        if current_turn == "WHITE_TURN" and chess_piece.get_color() != "White":
            return False

        if self._chess_board[current_row][current_column].get_obj_id() == "Pawn":
            if not self._chess_board[current_row][current_column].pawn_piece_mov(current_square, destination_square,
                                                                                 self._chess_board):
                return False
        if self._chess_board[current_row][current_column].get_obj_id() == "Rook":
            if not self._chess_board[current_row][current_column].rook_piece_mov(current_square, destination_square,
                                                                                 self._chess_board):
                return False
        if self._chess_board[current_row][current_column].get_obj_id() == "Knight":
            if not self._chess_board[current_row][current_column].knight_piece_mov(current_square, destination_square,
                                                                                   self._chess_board):
                return False
        if self._chess_board[current_row][current_column].get_obj_id() == "Bishop":
            if not self._chess_board[current_row][current_column].bishop_piece_mov(current_square, destination_square,
                                                                                   self._chess_board):
                return False
        if self._chess_board[current_row][current_column].get_obj_id() == "King":
            if not self._chess_board[current_row][current_column].king_piece_mov(current_square, destination_square,
                                                                                 self._chess_board):
                return False
        if self._chess_board[current_row][current_column].get_obj_id() == "Queen":
            if not self._chess_board[current_row][current_column].queen_piece_mov(current_square, destination_square,
                                                                                  self._chess_board):
                return False

        if capture_piece is not None and capture_piece.get_color() == chess_piece.get_color():
            return False

        self._chess_board[destination_row][destination_column] = chess_piece
        self._chess_board[current_row][current_column] = None

        chess_piece._current_square = destination_square

        if capture_piece is not None and capture_piece.get_color() != chess_piece.get_color():
            capture_piece_id = capture_piece.get_obj_id()
            self.increment_captures(capture_piece_id, current_turn)

        self.switch_players()
        return True

    def increment_captures(self, captured_piece, current_turn):
        blacks_captured_pieces = self._black_captured_pieces
        whites_captured_pieces = self._white_captured_pieces

        if current_turn == "BLACK_TURN":
            self._black_captured_pieces[captured_piece] += 1
            self._black_captured_pieces["Total_Captures"] += 1
            self.check_for_winner(blacks_captured_pieces, "BLACK_WON")

        elif current_turn == "WHITE_TURN":
            self._white_captured_pieces[captured_piece] += 1
            self._white_captured_pieces["Total_Captures"] += 1
            self.check_for_winner(whites_captured_pieces, "WHITE_WON")

    def check_for_winner(self, which_dict, which_winner):
        for chess_pieces, count_to_win in self._win_conditions.items():
            if which_dict[chess_pieces] == count_to_win:
                self._game_state = which_winner
                self._won_with = chess_pieces
                self.display_stats()
                return
        self._game_state = "Unfinished"

    def display_stats(self):
        if self._game_state == "BLACK_WON":
            print("Black, you are the winner! You won in: " + str(self._black_total_turns) + " turns.")
            print("Total Turns of Both Players: " + str(self._game_total_turns))
            print("Here are the pieces you captured!")
            print(self._black_captured_pieces)
            print("You won by capturing all of the " + str(self._won_with) + " pieces.")
        elif self._game_state == "WHITE_WON":
            print("White, you are the winner! You won in: " + str(self._white_total_turns) + " turns.")
            print("Total Turns of Both Players: " + str(self._game_total_turns))
            print("Here are the pieces you captured!")
            print(self._white_captured_pieces)
            print("You won by capturing all of the " + str(self._won_with) + " pieces.")

    def get_chess_board(self):
        return self._chess_board

    def get_game_state(self):
        return self._game_state


class ChessPiece:
    def __init__(self, current_square, color):
        self._current_square = current_square
        self._color = color

    def rec_algebraic_notation_conversion(self, a_notation, column=0, column_list=None):
        if column_list is None:
            column_list = ["a", "b", "c", "d", "e", "f", "g", "h"]
        if column >= len(column_list):
            raise OutOfBoundsError("File must be a..h")
        if a_notation[0] == column_list[column]:
            row = 8 - int(a_notation[1])
            coordinate_tuple = (row, column)
            return coordinate_tuple
        return self.rec_algebraic_notation_conversion(a_notation, column + 1, column_list)

    def get_obj_id(self):
        raise NotImplementedError

    def get_color(self):
        return self._color


class Pawn(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "Pawn"
        self._first_movement = True

    def pawn_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        row_move = destination_row - current_row
        column_move = destination_column - current_column

        
        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        
        one_move_down = None
        two_move_down = None
        one_move_up = None
        two_move_up = None

        if current_row + 1 <= 7:
            one_move_down = chess_board[current_row + 1][current_column]
        if current_row + 2 <= 7:
            two_move_down = chess_board[current_row + 2][current_column]
        if current_row - 1 >= 0:
            one_move_up = chess_board[current_row - 1][current_column]
        if current_row - 2 >= 0:
            two_move_up = chess_board[current_row - 2][current_column]

        
        if abs(column_move) == 1 and abs(row_move) == 1:
            if (self._color == "Black" and row_move == 1) or (self._color == "White" and row_move == -1):
                if chess_board[destination_row][destination_column] is not None and \
                        chess_board[destination_row][destination_column].get_color() != self._color:
                    self._first_movement = False
                    return True
                return False

        if column_move == 0:
            if self._color == "Black":
                if self._first_movement and row_move == 2:
                    if two_move_down is None and one_move_down is None and \
                            chess_board[destination_row][destination_column] is None:
                        self._first_movement = False
                        return True
                elif self._first_movement and row_move == 1:
                    if one_move_down is None and chess_board[destination_row][destination_column] is None:
                        self._first_movement = False
                        return True
                elif row_move == 1 and chess_board[destination_row][destination_column] is None:
                    self._first_movement = False
                    return True

            if self._color == "White":
                if self._first_movement and row_move == -2:
                    if two_move_up is None and one_move_up is None and \
                            chess_board[destination_row][destination_column] is None:
                        self._first_movement = False
                        return True
                elif self._first_movement and row_move == -1:
                    if one_move_up is None and chess_board[destination_row][destination_column] is None:
                        self._first_movement = False
                        return True
                elif row_move == -1 and chess_board[destination_row][destination_column] is None:
                    self._first_movement = False
                    return True

        return False


    def get_obj_id(self):
        return self._obj_id


class Rook(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "Rook"

    def rook_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        change_row = current_row != destination_row
        change_column = current_column != destination_column

        one_mov_right = current_column + 1
        one_mov_left = current_column - 1
        one_mov_down = current_row + 1
        one_mov_up = current_row - 1

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if change_row and change_column:
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if current_row == destination_row and chess_board_row_limits and chess_board_column_limits:
            if current_column < destination_column:
                while one_mov_right < destination_column:
                    if chess_board[current_row][one_mov_right] is not None:
                        return False
                    one_mov_right += 1
                return True
            elif current_column > destination_column:
                while one_mov_left > destination_column:
                    if chess_board[current_row][one_mov_left] is not None:
                        return False
                    one_mov_left -= 1
                return True

        if current_column == destination_column and chess_board_row_limits and chess_board_column_limits:
            if current_row < destination_row:
                while one_mov_down < destination_row:
                    if chess_board[one_mov_down][current_column] is not None:
                        return False
                    one_mov_down += 1
                return True
            elif current_row > destination_row:
                while one_mov_up > destination_row:
                    if chess_board[one_mov_up][current_column] is not None:
                        return False
                    one_mov_up -= 1
                return True

        if chess_board[destination_row][destination_column] is None:
            return True
        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() != self.get_color():
            return True

        return False

    def get_obj_id(self):
        return self._obj_id


class Knight(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "Knight"

    def knight_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        row_move = abs(destination_row - current_row)
        column_move = abs(destination_column - current_column)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if (row_move == 2 and column_move == 1) or (row_move == 1 and column_move == 2):
            if chess_board[destination_row][destination_column] is None:
                return True
            if chess_board[destination_row][destination_column] is not None and \
                    chess_board[destination_row][destination_column].get_color() != self.get_color():
                return True

        return False

    def get_obj_id(self):
        return self._obj_id


class Bishop(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "Bishop"

    def bishop_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        which_row_direction = 0
        which_column_direction = 0

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if destination_row == current_row and destination_column != current_column:
            return False
        if destination_row != current_row and destination_column == current_column:
            return False

        if abs(destination_row - current_row) != abs(destination_column - current_column):
            return False

        if destination_row > current_row:
            which_row_direction = 1
        elif destination_row < current_row:
            which_row_direction = -1

        if destination_column > current_column:
            which_column_direction = 1
        elif destination_column < current_column:
            which_column_direction = -1

        next_row = current_row + which_row_direction
        next_column = current_column + which_column_direction

        while next_row != destination_row and next_column != destination_column:
            if chess_board[next_row][next_column] is not None:
                return False
            next_row += which_row_direction
            next_column += which_column_direction

        if chess_board[destination_row][destination_column] is None:
            return True

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() != self.get_color():
            return True

        return False

    def get_obj_id(self):
        return self._obj_id


class King(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "King"

    def king_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        row_move = abs(destination_row - current_row)
        column_move = abs(destination_column - current_column)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if row_move > 1 or column_move > 1:
            return False

        if chess_board[destination_row][destination_column] is None:
            return True

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() != self.get_color():
            return True

        return False

    def get_obj_id(self):
        return self._obj_id


class Queen(ChessPiece):
    def __init__(self, current_square, color):
        super().__init__(current_square, color)
        self._obj_id = "Queen"

    def queen_piece_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if current_row == destination_row and chess_board_row_limits and chess_board_column_limits:
            return self.copy_rook_mov(current_square, destination_square, chess_board)

        elif current_column == destination_column and chess_board_row_limits and chess_board_column_limits:
            return self.copy_rook_mov(current_square, destination_square, chess_board)

        elif abs(destination_row - current_row) == abs(destination_column - current_column) and chess_board_row_limits \
                and chess_board_column_limits:
            return self.copy_bishop_mov(current_square, destination_square, chess_board)

        return False

    def copy_rook_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        change_row = current_row != destination_row
        change_column = current_column != destination_column

        one_mov_right = current_column + 1
        one_mov_left = current_column - 1
        one_mov_down = current_row + 1
        one_mov_up = current_row - 1

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if change_row and change_column:
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if current_row == destination_row and chess_board_row_limits and chess_board_column_limits:
            if current_column < destination_column:
                while one_mov_right < destination_column:
                    if chess_board[current_row][one_mov_right] is not None:
                        return False
                    one_mov_right += 1
                return True
            elif current_column > destination_column:
                while one_mov_left > destination_column:
                    if chess_board[current_row][one_mov_left] is not None:
                        return False
                    one_mov_left -= 1
                return True

        if current_column == destination_column and chess_board_row_limits and chess_board_column_limits:
            if current_row < destination_row:
                while one_mov_down < destination_row:
                    if chess_board[one_mov_down][current_column] is not None:
                        return False
                    one_mov_down += 1
                return True
            elif current_row > destination_row:
                while one_mov_up > destination_row:
                    if chess_board[one_mov_up][current_column] is not None:
                        return False
                    one_mov_up -= 1
                return True

        if chess_board[destination_row][destination_column] is None:
            return True
        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() != self.get_color():
            return True

        return False

    def copy_bishop_mov(self, current_square, destination_square, chess_board):
        current_row, current_column = self.rec_algebraic_notation_conversion(current_square)
        destination_row, destination_column = self.rec_algebraic_notation_conversion(destination_square)

        chess_board_row_limits = 0 <= destination_row <= 7
        chess_board_column_limits = 0 <= destination_column <= 7

        which_row_direction = 0
        which_column_direction = 0

        if not chess_board_row_limits:
            return False
        if not chess_board_column_limits:
            return False

        if destination_row == current_row and destination_column != current_column:
            return False
        if destination_row != current_row and destination_column == current_column:
            return False

        if abs(destination_row - current_row) != abs(destination_column - current_column):
            return False

        if destination_row > current_row:
            which_row_direction = 1
        elif destination_row < current_row:
            which_row_direction = -1

        if destination_column > current_column:
            which_column_direction = 1
        elif destination_column < current_column:
            which_column_direction = -1

        next_row = current_row + which_row_direction
        next_column = current_column + which_column_direction

        while next_row != destination_row and next_column != destination_column:
            if chess_board[next_row][next_column] is not None:
                return False
            next_row += which_row_direction
            next_column += which_column_direction

        if chess_board[destination_row][destination_column] is None:
            return True

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() == self.get_color():
            return False

        if chess_board[destination_row][destination_column] is not None and \
                chess_board[destination_row][destination_column].get_color() != self.get_color():
            return True

        return False

    def get_obj_id(self):
        return self._obj_id

    def get_color(self):
        return self._color


GAME = Chess()

def _piece_name(p):
    return f"{p.get_color()}_{p.get_obj_id()}"

def _board_strings():
    out = []
    for r in range(8):
        row = []
        for c in range(8):
            obj = GAME._chess_board[r][c]
            row.append(_piece_name(obj) if obj is not None else None)
        out.append(row)
    return out

def py_state():
    return {
        "board": _board_strings(),
        "turn": "White" if GAME._turn_tracker == "WHITE_TURN" else "Black",
        "game_state": GAME.get_game_state(),
        "caps_white": {k:v for k,v in GAME._white_captured_pieces.items() if k != "Total_Captures"},
        "caps_black": {k:v for k,v in GAME._black_captured_pieces.items() if k != "Total_Captures"},
    }

def py_state_json():
    import json
    return json.dumps(py_state())

def py_move(src, dst):
    import json
    ok = GAME.make_move(src, dst)
    msg = "Move applied." if ok else "Illegal move."
    return json.dumps({"ok": ok, "message": msg, "state": py_state()})

def py_reset():
    global GAME
    GAME = Chess()
    return True
`;
