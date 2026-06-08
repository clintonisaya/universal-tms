"""Document Attachment helpers.

Owns per-domain attachment policies, file validation, storage key generation,
presigned URL enrichment, and common attachment mechanics.  Route adapters call
these functions instead of duplicating validation and key-generation logic.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Error types
# ---------------------------------------------------------------------------


class DocumentError(ValueError):
    """Base error for document attachment violations."""
    detail: str

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class InvalidFileTypeError(DocumentError):
    """Raised when the uploaded file type is not in the allowed list."""


class FileTooLargeError(DocumentError):
    """Raised when the uploaded file exceeds the policy size limit."""


class AttachmentNotFoundError(DocumentError):
    """Raised when the requested attachment key is not in the list."""


# ---------------------------------------------------------------------------
# Attachment policy
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AttachmentPolicy:
    """Describes what files a domain accepts and how large they can be."""
    allowed_types: frozenset[str]
    max_size_bytes: int
    key_prefix: str


# Trip documents: PDF, images, Word, Excel — 5 MB
TRIP_ATTACHMENT_POLICY = AttachmentPolicy(
    allowed_types=frozenset({
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    max_size_bytes=5 * 1024 * 1024,  # 5 MB
    key_prefix="trips",
)

# Expense receipts: PDF, images, Word, Excel — 3 MB
EXPENSE_ATTACHMENT_POLICY = AttachmentPolicy(
    allowed_types=frozenset({
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    max_size_bytes=3 * 1024 * 1024,  # 3 MB
    key_prefix="expenses",
)

# Invoice proof-of-payment: PDF and images only — 5 MB
POP_ATTACHMENT_POLICY = AttachmentPolicy(
    allowed_types=frozenset({
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    }),
    max_size_bytes=5 * 1024 * 1024,  # 5 MB
    key_prefix="pop",
)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

_HUMAN_MAX = {
    3 * 1024 * 1024: "3 MB",
    5 * 1024 * 1024: "5 MB",
}


def validate_attachment(
    content_type: str | None,
    size: int,
    policy: AttachmentPolicy,
) -> None:
    """Validate file type and size against a policy.

    Raises InvalidFileTypeError or FileTooLargeError on violation.
    Returns silently when valid.
    """
    if content_type and content_type not in policy.allowed_types:
        allowed = ", ".join(sorted(policy.allowed_types))
        raise InvalidFileTypeError(
            f"File type '{content_type}' is not allowed. "
            f"Accepted: {allowed}"
        )

    if size > policy.max_size_bytes:
        limit = _HUMAN_MAX.get(policy.max_size_bytes, f"{policy.max_size_bytes} bytes")
        raise FileTooLargeError(f"File size exceeds {limit} limit")


# ---------------------------------------------------------------------------
# Storage key generation
# ---------------------------------------------------------------------------

_HEX_LEN = 8


def generate_storage_key(prefix: str, entity_id: Any, filename: str | None) -> str:
    """Generate a unique storage key.

    Format: ``{prefix}/{entity_id}/{hex8}_{clean_filename}``
    """
    unique_id = uuid.uuid4().hex[:_HEX_LEN]
    clean_filename = (filename or "attachment").replace(" ", "_")
    return f"{prefix}/{entity_id}/{unique_id}_{clean_filename}"


def strip_hex_prefix(stored_filename: str) -> str:
    """Remove the 8-char hex prefix added during upload.

    Given ``a1b2c3d4_invoice.pdf``, returns ``invoice.pdf``.
    If the filename doesn't match the pattern, returns it unchanged.
    """
    if len(stored_filename) > _HEX_LEN + 1 and stored_filename[_HEX_LEN] == "_":
        return stored_filename[_HEX_LEN + 1:]
    return stored_filename


# ---------------------------------------------------------------------------
# URL enrichment — simple key lists (trips, expenses)
# ---------------------------------------------------------------------------


def enrich_attachment_urls(
    keys: list[str],
    storage: Any,
    expiration: int = 3600,
) -> list[dict[str, str]]:
    """Enrich a list of storage keys with presigned URLs and display filenames.

    Each key is expected in the form ``prefix/entity_id/hex8_realname``.
    Returns a list of ``{"key": key, "filename": name, "url": url}`` dicts.
    """
    result: list[dict[str, str]] = []
    for key in keys:
        url = storage.get_presigned_url(key, expiration=expiration)
        raw_filename = key.split("/")[-1] if "/" in key else key
        filename = strip_hex_prefix(raw_filename)
        result.append({"key": key, "filename": filename, "url": url})
    return result


# ---------------------------------------------------------------------------
# POP attachment entries (invoice payments use rich dict storage)
# ---------------------------------------------------------------------------


def build_pop_attachment_entry(
    storage_key: str,
    filename: str,
    content_type: str | None,
    user_id: Any,
) -> dict[str, Any]:
    """Create a rich attachment dict for POP storage on a payment record."""
    return {
        "id": uuid.uuid4().hex[:12],
        "key": storage_key,
        "filename": filename,
        "content_type": content_type,
        "uploaded_by": str(user_id),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


def enrich_pop_attachment_urls(
    attachments: list[dict[str, Any]],
    storage: Any,
    expiration: int = 3600,
) -> list[dict[str, Any]]:
    """Enrich POP attachment dicts with presigned URLs.

    Returns a new list with ``url`` added to each attachment dict.
    """
    result: list[dict[str, Any]] = []
    for att in attachments:
        url = storage.get_presigned_url(att["key"], expiration=expiration)
        result.append({**att, "url": url})
    return result
