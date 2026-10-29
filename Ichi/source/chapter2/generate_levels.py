#!/usr/bin/env python3
"""Generate chapter two for Ichi Sokoban.

Tile rules shared with assets/js/engine.js:
  #  wall; interior # tiles render as bushes
  @  player; $ crate; . crate goal
  b  pushable bone; p open pit
  Pushing b into an adjacent p buries the bone and fills that pit.
  The player cannot walk into open pits. Crates cannot be pushed into
  bones or open pits. A level clears only when every crate is on a goal
  and every bone has been buried.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_JSON = ROOT / "source" / "chapter2.levels.json"
OUTPUT_JS = ROOT / "assets" / "js" / "chapter2.generated.js"
SEED = 20261028
WIDTH = 11
HEIGHT = 9

RULES = [
    "The player pushes crates onto all green goals.",
    "Bones are pushable. Push each bone into a pit to bury it and fill the pit.",
    "The player cannot enter an open pit.",
    "Crates cannot be pushed into bones or open pits.",
    "Optional interior # tiles are impassable bushes from chapter one.",
    "A level is complete only when every crate is on a goal and every bone is buried.",
]


def empty_board() -> list[list[str]]:
    return [
        [
            "#" if x in (0, WIDTH - 1) or y in (0, HEIGHT - 1) else " "
            for x in range(WIDTH)
        ]
        for y in range(HEIGHT)
    ]


def build_level(index: int, rng: random.Random) -> dict:
    """Build one safely solvable map with clear lanes and progressive objectives."""
    board = empty_board()

    box_count = 1 if index < 5 else 2 if index < 15 else 3
    bone_count = 1 if index < 10 else 2 if index < 20 else 3

    # Main lane: bury its bone first, then push its crate along the cleared path.
    box_x = 2 + (index % 2)
    bone_x = box_x + 2 + ((index // 2) % 2)
    pit_x = bone_x + 2
    board[1][1] = "@"
    board[1][box_x] = "$"
    board[1][bone_x] = "b"
    board[1][pit_x] = "p"
    board[1][9] = "."

    # Further crate lanes arrive before additional bone/pit pairs.
    if box_count >= 2:
        board[3][2] = "$"
        board[3][9] = "."
    if bone_count >= 2:
        board[5][2] = "b"
        board[5][7] = "p"
    if box_count >= 3:
        board[7][2] = "$"
        board[7][9] = "."
    if bone_count >= 3:
        third_bone_x = 4 + (index % 2)
        board[3][third_bone_x] = "b"
        board[3][third_bone_x + 3] = "p"

    # Bushes are optional and only occupy connector rows. Every push lane stays open,
    # and the left edge remains clear so Ichi can reach the back of each object.
    bush_rows = [
        (2, min(3, 1 + index // 9), list(range(6, 9))),
        (4, min(3, 1 + index // 10), list(range(2, 9))),
        (6, min(3, 1 + index // 10), list(range(2, 9))),
    ]
    bushes: list[tuple[int, int]] = []
    if index % 5 != 0:
        for y, count, candidates in bush_rows:
            bushes.extend((x, y) for x in rng.sample(candidates, count))

    for x, y in bushes:
        if board[y][x] != " ":
            raise ValueError(f"Bush overlaps a game object at {(x, y)}")
        board[y][x] = "#"

    rows = ["".join(row) for row in board]
    level = {
        "number": index + 26,
        "rows": rows,
        "crates": box_count,
        "bones": bone_count,
        "pits": bone_count,
        "bushes": len(bushes),
    }
    validate_level(level)
    return level


def validate_level(level: dict) -> None:
    rows = level["rows"]
    if len(rows) != HEIGHT or any(len(row) != WIDTH for row in rows):
        raise ValueError(f"Level {level['number']}: board must be {WIDTH}x{HEIGHT}")
    cells = "".join(rows)
    if cells.count("@") != 1:
        raise ValueError(f"Level {level['number']}: expected exactly one player")
    if cells.count("$") != level["crates"]:
        raise ValueError(f"Level {level['number']}: crate count mismatch")
    if cells.count(".") != level["crates"]:
        raise ValueError(f"Level {level['number']}: goal count mismatch")
    if cells.count("b") != level["bones"] or cells.count("p") != level["pits"]:
        raise ValueError(f"Level {level['number']}: bone/pit count mismatch")
    # A continuous left-side route connects all four push lanes.
    if any(rows[y][1] not in " @" for y in range(1, HEIGHT - 1)):
        raise ValueError(f"Level {level['number']}: left access lane is blocked")


def main() -> None:
    rng = random.Random(SEED)
    levels = [build_level(index, rng) for index in range(25)]
    payload = {
        "chapter": 2,
        "first_level": 26,
        "rules": RULES,
        "levels": levels,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    maps = [level["rows"] for level in levels]
    js_maps = json.dumps(maps, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_JS.write_text(
        '(function (M) { "use strict"; M.chapter2Maps = Object.freeze('
        + js_maps
        + '.map((rows) => Object.freeze(rows))); })(window.Mochi);\n',
        encoding="utf-8",
    )

    for level in levels:
        print(
            f"Уровень {level['number']}: "
            f"коробок {level['crates']}, косточек {level['bones']}, "
            f"кустов {level['bushes']}"
        )
    print(f"Созданы {len(levels)} уровней главы 2.")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"JS:   {OUTPUT_JS}")


if __name__ == "__main__":
    main()