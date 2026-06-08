"""Document Attachment module.

Owns per-domain attachment policies, file validation, storage key generation,
presigned URL enrichment, and common attachment mechanics above the storage
adapter layer.
"""

from app.modules.documents.helpers import (
    EXPENSE_ATTACHMENT_POLICY,
    POP_ATTACHMENT_POLICY,
    TRIP_ATTACHMENT_POLICY,
    AttachmentNotFoundError,
    AttachmentPolicy,
    DocumentError,
    FileTooLargeError,
    InvalidFileTypeError,
    build_pop_attachment_entry,
    enrich_attachment_urls,
    enrich_pop_attachment_urls,
    generate_storage_key,
    strip_hex_prefix,
    validate_attachment,
)

__all__ = [
    # policies
    "AttachmentPolicy",
    "TRIP_ATTACHMENT_POLICY",
    "EXPENSE_ATTACHMENT_POLICY",
    "POP_ATTACHMENT_POLICY",
    # errors
    "DocumentError",
    "InvalidFileTypeError",
    "FileTooLargeError",
    "AttachmentNotFoundError",
    # validation
    "validate_attachment",
    # key generation
    "generate_storage_key",
    "strip_hex_prefix",
    # URL enrichment
    "enrich_attachment_urls",
    "enrich_pop_attachment_urls",
    # POP entries
    "build_pop_attachment_entry",
]
