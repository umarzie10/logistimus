# QA Defect Management & Bug Tracker (07_BUG_TRACKER.md)

- **Audit Date:** 2026-11-09
- **Auditor:** Lead QA & Reliability Engineer
- **Total Defects Identified:** 4
- **Total Defects Resolved:** 4
- **Remaining Open Defects:** 0

---

## Defect Inventory

| ID | Module | Severity | Description | Root Cause | Status | Regression Test |
|---|---|---|---|---|---|---|
| **BUG-001** | `apps.permissions` | MEDIUM | N+1 database queries on `/api/v1/roles/` endpoint (19 queries for 12 roles) | `RoleSerializer.get_permissions()` called `select_related()` on each item's related manager, bypassing the `prefetch_related("grants__permission")` cache | **FIXED** | `tests/test_performance_e2e_qa.py::TestDatabaseQueryPerformance::test_role_list_query_count_is_bounded` |
| **BUG-002** | `config.settings` | LOW | PyJWT emitted `InsecureKeyLengthWarning` regarding RFC 7518 Section 3.2 minimum 32-byte HMAC key length | Default fallback `SECRET_KEY` in `base.py` was 24 bytes long (`unsafe-dev-key-change-me`) | **FIXED** | `tests/test_security_audit_qa.py::TestTokenAndAuthPenetration` |
| **BUG-003** | `Backend/pyproject.toml` | LOW | Pytest emitted `PytestConfigWarning: Unknown config option: DJANGO` | Invalid option key in `[tool.pytest.ini_options]`; options were already declared in `addopts` | **FIXED** | `tests/test_core_phase1.py` (0 pytest warnings) |
| **BUG-004** | `Backend/staticfiles/` | LOW | WhiteNoise emitted `UserWarning: No directory at: .../staticfiles/` during application boot | Staticfiles directory did not exist in repository before `collectstatic` | **FIXED** | Clean test startup (0 filesystem warnings) |

---

## Detailed Root Cause & Remediation Logs

### BUG-001: N+1 Query in Role Serializer
- **Observation:** Calling `GET /api/v1/roles/` with 12 seeded roles generated 19 SQL queries when measured using `CaptureQueriesContext`.
- **Root Cause:**
  ```python
  # BEFORE (apps/permissions/serializers.py)
  def get_permissions(self, obj: Role) -> list[str]:
      return sorted(rp.permission.code for rp in obj.grants.select_related("permission"))
  ```
  `obj.grants.select_related(...)` constructs and executes a fresh SQL query for every single role in the list, even though `RoleListCreateView` had already called `.prefetch_related("grants__permission")`.
- **Remediation:**
  ```python
  # AFTER (apps/permissions/serializers.py)
  def get_permissions(self, obj: Role) -> list[str]:
      return sorted(rp.permission.code for rp in obj.grants.all())
  ```
  Replaced with `obj.grants.all()`, which directly reads the cached prefetch cache in memory without issuing secondary queries.
- **Verification:** Query count dropped from 19 to 3 constant queries (O(1)).

### BUG-002: Insecure HMAC Key Length Warning
- **Observation:** `InsecureKeyLengthWarning: The HMAC key is 24 bytes long, which is below the minimum recommended length of 32 bytes for SHA256.`
- **Root Cause:** Development setting `SECRET_KEY` default was 24 characters.
- **Remediation:** Upgraded default development key and test key to 64-character high-entropy strings, satisfying RFC 7518 Section 3.2.
- **Verification:** Pytest test run executes with zero key length warnings.
