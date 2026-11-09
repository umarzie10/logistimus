"""Permission catalog + builtin role grants (API_SPECIFICATION §5).

Code format is `<module>.<object>.<action>` (e.g. `orders.order.view`),
matching the catalog examples in the spec. Actions are the five CRUD-ish
verbs the spec allows: view / create / change / delete / export.

This module is pure data — seeding happens in a migration (global catalog)
and per-organization at registration (builtin roles), see services.py.
"""

from __future__ import annotations

# module -> {label, objects: {object: (actions...)}}
MODULES: dict[str, dict] = {
    "org": {
        "label": "Organization",
        "objects": {
            "organization": ("view", "change"),
            "branch": ("view", "create", "change"),
            "department": ("view", "create", "change"),
            "settings": ("view", "change"),
            "apikey": ("view", "create", "change", "delete"),
            "role": ("view", "create", "change", "delete"),
            "permission": ("view",),
        },
    },
    "users": {
        "label": "Users & membership",
        "objects": {
            "member": ("view", "change", "delete"),
            "invitation": ("view", "create", "delete"),
        },
    },
    "orders": {
        "label": "Orders",
        "objects": {
            "order": ("view", "create", "change", "delete", "export"),
            "item": ("view", "create", "change"),
        },
    },
    "shipments": {
        "label": "Shipments",
        "objects": {
            "shipment": ("view", "create", "change", "delete", "export"),
            "stop": ("view", "create", "change"),
            "pod": ("view", "create"),
        },
    },
    "dispatch": {
        "label": "Dispatch",
        "objects": {
            "dispatch": ("view", "create", "change"),
            "assignment": ("view", "create", "change"),
        },
    },
    "routing": {
        "label": "Routing",
        "objects": {
            "route": ("view", "create", "change", "delete"),
            "suggestion": ("view", "create"),
        },
    },
    "fleet": {
        "label": "Fleet",
        "objects": {
            "vehicle": ("view", "create", "change", "delete"),
            "category": ("view", "create", "change"),
            "maintenance": ("view", "create", "change"),
            "fuel": ("view", "create", "export"),
        },
    },
    "drivers": {
        "label": "Drivers",
        "objects": {
            "driver": ("view", "create", "change", "delete"),
            "duty_log": ("view", "create", "change"),
            "inspection": ("view", "create"),
            "logbook": ("view", "export"),
        },
    },
    "warehouses": {
        "label": "Warehouses",
        "objects": {
            "warehouse": ("view", "create", "change"),
            "dock_bay": ("view", "create", "change"),
            "zone": ("view", "create", "change"),
        },
    },
    "inventory": {
        "label": "Inventory",
        "objects": {
            "item": ("view", "create", "change", "export"),
            "stock_level": ("view", "change", "export"),
            "stock_movement": ("view", "create", "export"),
            "transfer": ("view", "create", "change"),
        },
    },
    "crm": {
        "label": "CRM",
        "objects": {
            "customer": ("view", "create", "change", "delete"),
            "contact": ("view", "create", "change", "delete"),
            "contract": ("view", "create", "change", "delete"),
            "lead": ("view", "create", "change", "delete"),
            "communication": ("view", "create"),
        },
    },
    "finance": {
        "label": "Finance",
        "objects": {
            "invoice": ("view", "create", "change", "delete", "export"),
            "payment": ("view", "create", "change", "export"),
            "expense": ("view", "create", "change", "delete", "export"),
            "settlement": ("view", "create", "change", "export"),
            "report": ("view", "export"),
        },
    },
    "documents": {
        "label": "Documents",
        "objects": {
            "document": ("view", "create", "change", "delete"),
        },
    },
    "tracking": {
        "label": "Tracking",
        "objects": {
            "device": ("view", "create", "change", "delete"),
            "location": ("view", "export"),
        },
    },
    "notifications": {
        "label": "Notifications",
        "objects": {
            "notification": ("view", "change"),
            "preference": ("view", "change"),
        },
    },
    "analytics": {
        "label": "Analytics",
        "objects": {
            "dashboard": ("view",),
            "report": ("view", "export"),
        },
    },
    "subscriptions": {
        "label": "Subscriptions",
        "objects": {
            "subscription": ("view", "change"),
        },
    },
    "integrations": {
        "label": "Integrations",
        "objects": {
            "connection": ("view", "create", "change", "delete"),
            "webhook": ("view", "create", "change", "delete"),
        },
    },
    "ai": {
        "label": "AI assistant",
        "objects": {
            "chat": ("view", "create"),
        },
    },
}


def all_codes() -> list[str]:
    """Every permission code in the catalog, sorted."""
    codes: list[str] = []
    for module, spec in MODULES.items():
        for obj, actions in spec["objects"].items():
            for action in actions:
                codes.append(f"{module}.{obj}.{action}")
    return sorted(codes)


def expand(grants: list[str]) -> list[str]:
    """Expand grant patterns to explicit codes.

    Patterns: "*" (whole catalog), "module" (every object/action in it),
    "module.object" (every action of one object), or a full code.
    """
    if "*" in grants:
        return all_codes()

    codes: set[str] = set()
    for grant in grants:
        if "." not in grant:
            # whole module
            if grant in MODULES:
                for obj, actions in MODULES[grant]["objects"].items():
                    codes.update(f"{grant}.{obj}.{a}" for a in actions)
            continue
        parts = grant.split(".")
        if len(parts) == 2:
            module, obj = parts
            actions = MODULES.get(module, {}).get("objects", {}).get(obj)
            if actions:
                codes.update(f"{module}.{obj}.{a}" for a in actions)
            continue
        codes.add(grant)  # full code
    return sorted(codes)


# Builtin roles seeded for every new organization (DATABASE_SCHEMA §3 —
# org-scoped rows so custom and builtin roles share one path).
BUILTIN_ROLES: dict[str, dict] = {
    "owner": {
        "label": "Owner",
        "description": "Full control including billing and member management.",
        "grants": ["*"],
    },
    "super_admin": {
        "label": "Super Admin",
        "description": "Organization-wide administration.",
        "grants": ["*"],
    },
    "company_admin": {
        "label": "Company Admin",
        "description": "Runs the company day to day; cannot remove members.",
        "grants": [
            "org",
            "users.member.view",
            "users.invitation",
            "orders",
            "shipments",
            "dispatch",
            "routing",
            "fleet",
            "drivers",
            "warehouses",
            "inventory",
            "crm",
            "finance",
            "documents",
            "tracking",
            "notifications",
            "analytics",
            "subscriptions",
            "integrations",
            "ai",
        ],
    },
    "operations_manager": {
        "label": "Operations Manager",
        "description": "Owns orders, dispatch, warehouse flow and reporting.",
        "grants": [
            "org.organization.view",
            "org.branch.view",
            "org.settings.view",
            "org.role.view",
            "org.permission",
            "users.member.view",
            "orders",
            "shipments",
            "dispatch",
            "routing",
            "warehouses",
            "inventory",
            "documents",
            "notifications",
            "analytics",
        ],
    },
    "dispatcher": {
        "label": "Dispatcher",
        "description": "Assigns loads, tracks shipments, coordinates drivers.",
        "grants": [
            "org.organization.view",
            "org.role.view",
            "orders",
            "shipments",
            "dispatch",
            "routing",
            "fleet.vehicle.view",
            "drivers.driver.view",
            "warehouses.warehouse.view",
            "notifications",
            "analytics.dashboard.view",
        ],
    },
    "fleet_manager": {
        "label": "Fleet Manager",
        "description": "Vehicles, maintenance, fuel and driver documents.",
        "grants": [
            "org.organization.view",
            "org.role.view",
            "fleet",
            "drivers",
            "dispatch.dispatch.view",
            "orders.order.view",
            "documents",
            "notifications",
            "analytics",
        ],
    },
    "driver": {
        "label": "Driver",
        "description": "Own trips, documents and logbook (own-scope rows).",
        "grants": [
            "orders.order.view",
            "shipments",
            "dispatch.dispatch.view",
            "drivers.duty_log",
            "drivers.inspection",
            "drivers.logbook",
            "documents.document.view",
            "notifications",
        ],
    },
    "warehouse_manager": {
        "label": "Warehouse Manager",
        "description": "Stock levels, movements, docks and transfers.",
        "grants": [
            "org.organization.view",
            "org.branch.view",
            "org.role.view",
            "warehouses",
            "inventory",
            "orders.order.view",
            "shipments.shipment.view",
            "documents",
            "notifications",
            "analytics",
        ],
    },
    "accountant": {
        "label": "Accountant",
        "description": "Invoices, payments, expenses and settlements.",
        "grants": [
            "org.organization.view",
            "org.role.view",
            "finance",
            "crm.contract.view",
            "orders.order.view",
            "documents.document.view",
            "notifications",
            "analytics",
        ],
    },
    "sales_manager": {
        "label": "Sales Manager",
        "description": "CRM pipeline and quote-to-order flow.",
        "grants": [
            "org.organization.view",
            "org.role.view",
            "crm",
            "orders.order.view",
            "orders.order.create",
            "documents.document.view",
            "notifications",
            "analytics",
        ],
    },
    "customer": {
        "label": "Customer",
        "description": "Sees own orders, shipments and documents (own-scope).",
        "grants": [
            "orders.order.view",
            "shipments.shipment.view",
            "documents.document.view",
            "notifications",
        ],
    },
    "support_agent": {
        "label": "Support Agent",
        "description": "Answers customers, reads orders to resolve issues.",
        "grants": [
            "org.organization.view",
            "org.role.view",
            "crm.customer.view",
            "crm.contact.view",
            "crm.communication",
            "orders.order.view",
            "shipments.shipment.view",
            "documents.document.view",
            "notifications",
        ],
    },
}

# Roles that always receive the whole catalog (kept as a set so newly added
# permission codes flow to them without reseeding old organizations).
WILDCARD_ROLES = frozenset({"owner", "super_admin"})
