"""Shared pagination contract (API_SPECIFICATION §1.3)."""

from __future__ import annotations

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Envelope: {count, page, page_size, pages, results}."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return {
            "count": self.page.paginator.count,
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "pages": self.page.paginator.num_pages,
            "results": data,
        }
