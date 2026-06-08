"""Master Data Catalog module.

Owns shared CRUD mechanics for simple reference-list route modules:
duplicate-name validation, filtered list queries with pagination,
and common error types.
"""

from app.modules.master_data.helpers import (
    DuplicateNameError,
    MasterDataError,
    NotFoundError,
    check_duplicate_name,
    filtered_list_query,
)

__all__ = [
    # errors
    "MasterDataError",
    "DuplicateNameError",
    "NotFoundError",
    # helpers
    "check_duplicate_name",
    "filtered_list_query",
]
