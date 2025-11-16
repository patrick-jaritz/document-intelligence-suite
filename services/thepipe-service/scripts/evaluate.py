from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict

import requests


def call_extract(endpoint: str, source: str, api_key: str | None = None) -> Dict[str, Any]:
    url = endpoint.rstrip("/") + "/extract"
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    if Path(source).exists():
        with open(source, "rb") as file_ptr:
            files = {"file": (Path(source).name, file_ptr)}
            response = requests.post(url, headers=headers, files=files, timeout=300)
    else:
        payload = {"source_url": source, "options": {"semantic": False}}
        response = requests.post(url, headers=headers, json=payload, timeout=300)

    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Call thepipe-service and print metrics.")
    parser.add_argument("--endpoint", default="http://localhost:8080", help="Base URL of the thepipe-service instance")
    parser.add_argument("--source", required=True, help="File path or URL to extract")
    parser.add_argument("--api-key", default=None, help="Optional bearer token")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON response")
    args = parser.parse_args()

    started = time.perf_counter()
    result = call_extract(args.endpoint, args.source, args.api_key)
    duration = time.perf_counter() - started

    print(f"Request took {duration:.2f}s")
    if args.pretty:
        print(json.dumps(result, indent=2))
    else:
        print(result)


if __name__ == "__main__":
    main()


