from __future__ import annotations

import base64
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi import status as http_status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from thepipe.scraper import scrape_file, scrape_url


class ExtractionOptions(BaseModel):
    semantic: bool = Field(
        default=False,
        description="Enable semantic embeddings (requires [semantic] extras).",
    )
    text_only: bool = Field(
        default=False,
        description="Return only textual chunks (drop images).",
    )
    model: Optional[str] = Field(
        default=None,
        description="Override model used for AI extraction (defaults to env DEFAULT_MODEL or thepipe default).",
    )


class ExtractRequest(BaseModel):
    source_url: Optional[str] = Field(
        default=None, description="Remote URL to scrape (file, webpage, GitHub repo, etc.)."
    )
    options: ExtractionOptions = Field(default_factory=ExtractionOptions)


DEFAULT_MODEL = os.getenv("DEFAULT_MODEL")
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY")
TMP_DIR = Path(os.getenv("TMP_DIR", tempfile.gettempdir()))
TMP_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="thepipe-service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_api_key():
    if SERVICE_API_KEY is None:
        return

    from fastapi import Header

    async def dependency(authorization: Optional[str] = Header(default=None)):
        if authorization is None or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
            )
        token = authorization.removeprefix("Bearer ").strip()
        if token != SERVICE_API_KEY:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

    return dependency


@app.get("/health")
async def health():
    return {"status": "ok"}


def _encode_chunk(chunk: Any, text_only: bool) -> Optional[dict[str, Any]]:
    ctype = chunk.get("type", "markdown")
    if text_only and ctype != "markdown":
        return None

    content = chunk.get("content")
    if ctype == "image" and isinstance(content, (str, bytes)):
        if isinstance(content, bytes):
            encoded = base64.b64encode(content).decode("utf-8")
            content = f"data:image/png;base64,{encoded}"
        elif not content.startswith("data:"):
            # assume path on disk; convert to base64
            try:
                with open(content, "rb") as image_file:
                    encoded = base64.b64encode(image_file.read()).decode("utf-8")
                content = f"data:image/png;base64,{encoded}"
            except FileNotFoundError:
                pass
    return {"type": ctype, "content": content}


async def _download_to_tmp(url: str) -> Path:
    filename = url.split("/")[-1] or "download.bin"
    tmp_path = TMP_DIR / filename

    async with httpx.AsyncClient(timeout=httpx.Timeout(120)) as client:
        response = await client.get(url)
        response.raise_for_status()
        tmp_path.write_bytes(response.content)

    return tmp_path


@app.post("/extract", dependencies=[Depends(require_api_key())] if SERVICE_API_KEY else None)
async def extract(
    payload: Optional[ExtractRequest] = None,
    file: Optional[UploadFile] = File(default=None),
):
    if payload is None and file is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Provide either source_url or upload a file.",
        )

    started = time.monotonic()
    tmp_file: Optional[Path] = None

    try:
        if payload and payload.source_url:
            if payload.source_url.startswith(("http://", "https://")):
                tmp_file = await _download_to_tmp(payload.source_url)
                chunks = scrape_file(
                    filepath=str(tmp_file),
                    semantic=payload.options.semantic,
                    model=payload.options.model or DEFAULT_MODEL,
                )
                source = payload.source_url
            else:
                # thepipe supports various schemes; let scrape_url handle it
                chunks = scrape_url(
                    payload.source_url,
                    semantic=payload.options.semantic,
                    model=payload.options.model or DEFAULT_MODEL,
                )
                source = payload.source_url
        elif file is not None:
            suffix = Path(file.filename or "upload.bin").suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp:
                tmp.write(await file.read())
                tmp_file = Path(tmp.name)
            chunks = scrape_file(
                filepath=str(tmp_file),
                semantic=False,
                model=payload.options.model if payload else DEFAULT_MODEL,
            )
            source = file.filename or tmp_file.name
        else:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Unsupported payload combination.",
            )

        normalized = []
        for chunk in chunks:
            normalized_chunk = _encode_chunk(chunk, payload.options.text_only if payload else False)
            if normalized_chunk:
                normalized.append(normalized_chunk)

        elapsed = time.monotonic() - started
        return {
            "success": True,
            "source": source,
            "elapsed_seconds": round(elapsed, 3),
            "semantic_embeddings": payload.options.semantic if payload else False,
            "chunks": normalized,
        }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    finally:
        if tmp_file and tmp_file.exists():
            try:
                tmp_file.unlink()
            except OSError:
                pass

