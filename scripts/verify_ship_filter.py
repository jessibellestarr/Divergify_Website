#!/usr/bin/env python3
import argparse
import json
import pathlib
import subprocess
import sys
from datetime import date

GATE_DIR = pathlib.Path("governance/ship-gates")

REQUIRED_FILTERS = [
    "legal_and_regulatory",
    "privacy_local_first_promise",
    "medical_scope_and_claims",
    "behavioral_science_alignment",
    "neurodivergence_research_alignment",
    "user_benefit_and_harm_check",
    "brand_voice_and_claims",
    "accessibility_and_inclusion",
    "security_and_reliability",
    "monetization_and_dark_pattern_check",
]

REQUIRED_TOUCH_FLAGS = [
    "user_data",
    "health_related_context",
    "third_party_network",
    "monetization_or_payments",
    "ai_processing",
]

ALLOWED_STATUS = {"pass", "n_a", "blocked"}
ALLOWED_RISK = {"low", "medium", "high"}

NON_PRODUCT_PREFIXES = (
    ".github/",
    "scripts/",
    "governance/",
    "content-lock/",
    "trash/",
)

NON_PRODUCT_FILES = {
    "AGENTS.md",
    "README.md",
    "SYSTEM_MAP.md",
    "FIELD_NOTES_LOCK.md",
}


def run_git(args):
    result = subprocess.run(
        ["git", *args],
        check=False,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(stderr or "git command failed")
    return result.stdout


def get_changed_files(diff_range=None, staged=True):
    if diff_range:
        output = run_git(["diff", "--name-only", diff_range])
    elif staged:
        output = run_git(["diff", "--cached", "--name-only"])
    else:
        output = run_git(["diff", "--name-only"])
    return [line.strip() for line in output.splitlines() if line.strip()]


def is_gate_file(path):
    return path.startswith("governance/ship-gates/") and path.endswith(".json")


def is_non_product_change(path):
    if path in NON_PRODUCT_FILES:
        return True
    if path.startswith(NON_PRODUCT_PREFIXES):
        return True
    if path.endswith(".md") or path.endswith(".txt"):
        return True
    return False


def validate_text(value, minimum_len):
    return isinstance(value, str) and len(value.strip()) >= minimum_len


def validate_gate_file(path):
    errors = []

    if not path.exists():
        return [f"{path}: file not found (did you stage but not create?)"]

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid JSON ({exc})"]

    required_top = [
        "feature_id",
        "feature_name",
        "owner",
        "date",
        "scope_summary",
        "risk_level",
        "touches",
        "filters",
        "ship_decision",
    ]

    for key in required_top:
        if key not in data:
            errors.append(f"{path}: missing key '{key}'")

    if errors:
        return errors

    if not validate_text(data["feature_id"], 5):
        errors.append(f"{path}: feature_id must be a non-empty string.")
    if not validate_text(data["feature_name"], 5):
        errors.append(f"{path}: feature_name must be a non-empty string.")
    if not validate_text(data["owner"], 2):
        errors.append(f"{path}: owner must be a non-empty string.")
    if not validate_text(data["scope_summary"], 20):
        errors.append(f"{path}: scope_summary should explain user impact (20+ chars).")

    if data["risk_level"] not in ALLOWED_RISK:
        errors.append(f"{path}: risk_level must be one of {sorted(ALLOWED_RISK)}.")

    try:
        date.fromisoformat(data["date"])
    except Exception:
        errors.append(f"{path}: date must be ISO format YYYY-MM-DD.")

    touches = data["touches"]
    if not isinstance(touches, dict):
        errors.append(f"{path}: touches must be an object.")
    else:
        for key in REQUIRED_TOUCH_FLAGS:
            if key not in touches:
                errors.append(f"{path}: touches missing '{key}'.")
            elif not isinstance(touches[key], bool):
                errors.append(f"{path}: touches['{key}'] must be boolean.")

    filters = data["filters"]
    if not isinstance(filters, dict):
        errors.append(f"{path}: filters must be an object.")
        return errors

    for filter_key in REQUIRED_FILTERS:
        entry = filters.get(filter_key)
        if not isinstance(entry, dict):
            errors.append(f"{path}: filters['{filter_key}'] must be an object.")
            continue

        status = entry.get("status")
        rationale = entry.get("rationale")
        evidence = entry.get("evidence")

        if status not in ALLOWED_STATUS:
            errors.append(f"{path}: filters['{filter_key}'].status must be one of {sorted(ALLOWED_STATUS)}.")
            continue

        if status == "blocked":
            errors.append(f"{path}: filters['{filter_key}'] is blocked.")

        if status == "pass":
            if not validate_text(rationale, 20):
                errors.append(f"{path}: filters['{filter_key}'] rationale must be 20+ chars when pass.")
            if not isinstance(evidence, list) or len(evidence) == 0:
                errors.append(f"{path}: filters['{filter_key}'] must include evidence entries when pass.")
            elif not all(validate_text(item, 5) for item in evidence):
                errors.append(f"{path}: filters['{filter_key}'] evidence entries must be non-empty strings.")
        else:
            if not validate_text(rationale, 8):
                errors.append(f"{path}: filters['{filter_key}'] rationale must be provided.")

    ship_decision = data["ship_decision"]
    if not isinstance(ship_decision, dict):
        errors.append(f"{path}: ship_decision must be an object.")
        return errors

    ready = ship_decision.get("ready")
    conditions = ship_decision.get("conditions")

    if ready is not True:
        errors.append(f"{path}: ship_decision.ready must be true before commit.")
    if not validate_text(conditions, 5):
        errors.append(f"{path}: ship_decision.conditions must explain constraints/notes.")

    if isinstance(touches, dict):
        if touches.get("user_data"):
            if filters.get("legal_and_regulatory", {}).get("status") != "pass":
                errors.append(f"{path}: user_data=true requires legal_and_regulatory=pass.")
            if filters.get("privacy_local_first_promise", {}).get("status") != "pass":
                errors.append(f"{path}: user_data=true requires privacy_local_first_promise=pass.")
        if touches.get("health_related_context"):
            required_health_filters = [
                "medical_scope_and_claims",
                "behavioral_science_alignment",
                "neurodivergence_research_alignment",
            ]
            for filter_name in required_health_filters:
                if filters.get(filter_name, {}).get("status") != "pass":
                    errors.append(f"{path}: health_related_context=true requires {filter_name}=pass.")
        if touches.get("third_party_network"):
            if filters.get("privacy_local_first_promise", {}).get("status") != "pass":
                errors.append(f"{path}: third_party_network=true requires privacy_local_first_promise=pass.")
        if touches.get("monetization_or_payments"):
            if filters.get("monetization_and_dark_pattern_check", {}).get("status") != "pass":
                errors.append(f"{path}: monetization_or_payments=true requires monetization_and_dark_pattern_check=pass.")
        if touches.get("ai_processing"):
            if filters.get("privacy_local_first_promise", {}).get("status") != "pass":
                errors.append(f"{path}: ai_processing=true requires privacy_local_first_promise=pass.")
            if filters.get("legal_and_regulatory", {}).get("status") != "pass":
                errors.append(f"{path}: ai_processing=true requires legal_and_regulatory=pass.")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate Divergify ship filters.")
    parser.add_argument(
        "--range",
        dest="diff_range",
        help="Git diff range (for CI), e.g. origin/main...HEAD",
    )
    parser.add_argument(
        "--staged",
        action="store_true",
        help="Use staged files instead of working tree (default when --range is not set).",
    )
    args = parser.parse_args()

    staged_mode = args.staged or not args.diff_range

    try:
        changed = get_changed_files(diff_range=args.diff_range, staged=staged_mode)
    except RuntimeError as exc:
        print(f"Ship filter check failed to read git diff: {exc}")
        return 1

    if not changed:
        print("Ship filter: no changed files detected.")
        return 0

    product_changes = [path for path in changed if not is_non_product_change(path)]
    gate_files = [path for path in changed if is_gate_file(path)]

    if not product_changes:
        print("Ship filter: no product-surface changes detected.")
        return 0

    if not gate_files:
        print("Ship filter blocked: product changes require a gate file update.")
        print("Create/update a JSON file in governance/ship-gates/ and stage it with the feature.")
        print("Template: governance/ship-gates/000-template.json")
        print("Detected product changes:")
        for path in product_changes:
            print(f"- {path}")
        return 1

    all_errors = []
    for gate_path in gate_files:
        errors = validate_gate_file(pathlib.Path(gate_path))
        all_errors.extend(errors)

    if all_errors:
        print("Ship filter blocked:")
        for err in all_errors:
            print(f"- {err}")
        return 1

    print("Ship filter passed.")
    for gate_path in gate_files:
        print(f"- {gate_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
