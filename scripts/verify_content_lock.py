#!/usr/bin/env python3
import hashlib
import json
import pathlib
import re
import sys

LOCK_PATH = pathlib.Path("content-lock/field-notes.lock.json")


def sha256_file(path: pathlib.Path) -> str:
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()


def parse_lock_entries(lock_text: str):
    trimmed = lock_text.strip()
    if not trimmed:
        return []

    if trimmed[0] == "[":
        try:
            lock_data = json.loads(trimmed)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in {LOCK_PATH}: {exc}") from exc

        if not isinstance(lock_data, list):
            raise ValueError(f"Lock file must contain a list. Got: {type(lock_data).__name__}")

        entries = []
        for entry in lock_data:
            if not isinstance(entry, dict):
                raise ValueError("Lock file JSON entries must be objects with path and sha256 fields.")
            path = str(entry.get("path", "")).strip()
            digest = str(entry.get("sha256", "")).strip()
            if not path or not digest:
                raise ValueError("Lock file JSON entries must include non-empty path and sha256 values.")
            entries.append({"path": path, "sha256": digest})
        return entries

    entries = []
    pattern = re.compile(r"^([a-fA-F0-9]{64})\s+(.+)$")
    for line in lock_text.splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or raw.lower().startswith("generated on:"):
            continue
        match = pattern.match(raw)
        if not match:
            raise ValueError(f"Invalid lock line format in {LOCK_PATH}: {raw}")
        digest, path = match.groups()
        entries.append({"path": path.strip(), "sha256": digest.lower()})

    if not entries:
        raise ValueError(f"No lock entries found in {LOCK_PATH}.")
    return entries


def main() -> int:
    if not LOCK_PATH.exists():
        print(f"Missing lock file: {LOCK_PATH}")
        return 1

    try:
        entries = parse_lock_entries(LOCK_PATH.read_text())
    except ValueError as exc:
        print(str(exc))
        return 1

    mismatches = []
    for entry in entries:
        path = pathlib.Path(entry["path"])
        expected = entry["sha256"]
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
