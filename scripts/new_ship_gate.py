#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import pathlib
import re
import sys

TEMPLATE = pathlib.Path("governance/ship-gates/000-template.json")
OUTPUT_DIR = pathlib.Path("governance/ship-gates")


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main():
    parser = argparse.ArgumentParser(description="Create a new Divergify ship-gate file.")
    parser.add_argument("title", help="Human-readable feature title")
    parser.add_argument("--owner", default="Divergify Team", help="Owner name")
    parser.add_argument("--risk", default="medium", choices=["low", "medium", "high"], help="Risk level")
    args = parser.parse_args()

    if not TEMPLATE.exists():
        print(f"Template not found: {TEMPLATE}")
        return 1

    today = dt.date.today().isoformat()
    slug = slugify(args.title)
    if not slug:
        print("Title must contain letters or numbers.")
        return 1

    feature_id = f"{today}-{slug}"
    output_path = OUTPUT_DIR / f"{feature_id}.json"

    if output_path.exists():
        print(f"Gate file already exists: {output_path}")
        return 1

    data = json.loads(TEMPLATE.read_text(encoding="utf-8"))
    data["feature_id"] = feature_id
    data["feature_name"] = args.title
    data["owner"] = args.owner
    data["date"] = today
    data["risk_level"] = args.risk

    output_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Created {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
