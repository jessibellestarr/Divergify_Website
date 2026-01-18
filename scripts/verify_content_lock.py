#!/usr/bin/env python3
import hashlib
import json
import pathlib
import sys

LOCK_PATH = pathlib.Path("content-lock/field-notes.lock.json")


def sha256_file(path: pathlib.Path) -> str:
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    if not LOCK_PATH.exists():
        print(f"Missing lock file: {LOCK_PATH}")
        return 1

    try:
        lock_data = json.loads(LOCK_PATH.read_text())
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in {LOCK_PATH}: {exc}")
        return 1

    if not isinstance(lock_data, list):
        print(f"Lock file must contain a list. Got: {type(lock_data).__name__}")
        return 1

    mismatches = []
    for entry in lock_data:
        path = pathlib.Path(entry.get("path", ""))
        expected = entry.get("sha256")
        if not path.exists():
            mismatches.append((str(path), "missing", expected))
            continue
        actual = sha256_file(path)
        if actual != expected:
            mismatches.append((str(path), actual, expected))

    if mismatches:
        print("Content lock mismatches found:")
        for path, actual, expected in mismatches:
            print(f"- {path}: expected {expected}, got {actual}")
        return 1

    print("Content lock verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
