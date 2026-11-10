"""`manage.py seed_staging` — load SYNTHETIC demo data into a staging DB.

Staging policy (docs/production/STAGING_READINESS.md): synthetic data only.
This command creates organizations, users, roles, branches, departments and
one pending invitation per org — every email ends in `@example.invalid`
(RFC 2606/6761 reserved TLD: never routable, never deliverable).

Safety (three independent guards, in order):
  1. `--yes-synthetic` must be passed — the command never runs bare;
  2. refuses when `DJANGO_ENV == "production"` (staging sets
     `DJANGO_ENV=staging` — see ENVIRONMENT_VARIABLES.md §0);
  3. refuses when the database already contains a NON-synthetic user —
     protects any database holding real people regardless of the label.

Idempotent: an organization whose name already exists is skipped whole,
so re-running never duplicates rows. Seeded users are created pre-verified
(`email_verified_at=now`) because staging has no SMTP — login works without
an email being sent. No platform-admin/superuser is ever created here.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, transaction
from django.utils import timezone

from apps.accounts.services import _unique_slug
from apps.core import audit, db
from apps.core.models import Organization, User
from apps.organizations import services as org_services
from apps.organizations.models import Branch, Department, Membership
from apps.permissions import services as perm_services
from apps.permissions.models import Role

SYNTHETIC_EMAIL_DOMAIN = "example.invalid"
PASSWORD_MIN = 8

# Two tenants is the minimum that makes tenant isolation observable in the
# UI (same user cannot see the other org's rows).
ORG_SPECS: list[dict] = [
    {
        "name": "Northwind Freight (Staging)",
        "fleet_band": "10-50",
        "members": [
            {"local": "owner", "first": "Staging", "last": "Owner", "role": "owner"},
            {"local": "dispatcher", "first": "Staging", "last": "Dispatcher", "role": "dispatcher"},
        ],
        "invite": {"local": "newcomer", "role": "dispatcher"},
        "branches": [
            {"name": "Headquarters", "type": "hq", "primary": True},
            {"name": "Regional Depot", "type": "branch", "primary": False},
        ],
        "departments": ["Operations", "Dispatch"],
    },
    {
        "name": "Acme Logistics (Staging)",
        "fleet_band": "50-200",
        "members": [
            {"local": "owner", "first": "Staging", "last": "Owner", "role": "owner"},
            {
                "local": "fleet",
                "first": "Staging",
                "last": "Fleet Manager",
                "role": "fleet_manager",
            },
        ],
        "invite": {"local": "newcomer", "role": "warehouse_manager"},
        "branches": [
            {"name": "Headquarters", "type": "hq", "primary": True},
            {"name": "Cold Storage", "type": "branch", "primary": False},
        ],
        "departments": ["Warehouse", "Fleet"],
    },
]


class Command(BaseCommand):
    help = "Seed synthetic staging data (organizations, users, roles) — never runs on production."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--yes-synthetic",
            action="store_true",
            help="Required. Confirms this targets a SYNTHETIC staging database.",
        )
        parser.add_argument(
            "--password",
            default=None,
            help=f"Password for every seeded user (min {PASSWORD_MIN} chars). "
            "Default: a random one printed once — record it now or use "
            "`manage.py changepassword <email>` later.",
        )

    def handle(self, *args, **options) -> None:
        # Guard 1 — explicit opt-in.
        if not options["yes_synthetic"]:
            raise CommandError(
                "Refusing to seed without --yes-synthetic. This command writes "
                "data; confirm the target is a staging database."
            )

        # Guard 2 — never production. Staging runs prod.py with
        # DJANGO_ENV=staging; production forces/sets DJANGO_ENV=production.
        if settings.DJANGO_ENV == "production":
            raise CommandError(
                "Refusing: DJANGO_ENV=production. Synthetic seed data must never "
                "be written to production. Staging sets DJANGO_ENV=staging."
            )

        # Guard 3 — never touch a database that holds real people.
        # Synthetic emails are on `.example.invalid` or `@example.invalid`
        # (e.g. `owner@northwind-freight-staging.example.invalid`).
        try:
            has_real_users = (
                User.objects.exclude(email__endswith=f"@{SYNTHETIC_EMAIL_DOMAIN}")
                .exclude(email__endswith=f".{SYNTHETIC_EMAIL_DOMAIN}")
                .exists()
            )
        except OperationalError as exc:
            raise CommandError(
                "Database not migrated — run `manage.py migrate` first."
            ) from exc
        if has_real_users:
            raise CommandError(
                "Refusing: this database contains non-synthetic users. The seed "
                "only targets databases where every account is @"
                f"{SYNTHETIC_EMAIL_DOMAIN}."
            )

        password = options["password"]
        generated = password is None
        if password is not None and len(password) < PASSWORD_MIN:
            raise CommandError(f"--password must be at least {PASSWORD_MIN} characters.")
        if generated:
            password = secrets.token_urlsafe(16)

        now = timezone.now()
        totals = {
            "organizations": 0,
            "users": 0,
            "memberships": 0,
            "branches": 0,
            "departments": 0,
            "invitations": 0,
        }
        skipped: list[str] = []

        for spec in ORG_SPECS:
            if Organization.objects.filter(name=spec["name"]).exists():
                skipped.append(spec["name"])
                continue
            self._seed_org(spec, password, now, totals)

        for key, value in totals.items():
            self.stdout.write(f"  {key}: {value}")
        if skipped:
            self.stdout.write(
                self.style.WARNING(f"  skipped (already present): {', '.join(skipped)}")
            )
        if generated:
            self.stdout.write(
                self.style.WARNING(
                    f"  generated password (shown once, not stored): {password}"
                )
            )
        self.stdout.write(self.style.SUCCESS("SEED_OK"))

    def _seed_org(self, spec: dict, password: str, now: datetime, totals: dict) -> None:
        """Create one complete tenant: users → org → context → structure →
        roles → memberships → invitation → audit. Mirrors accounts.register()
        minus the email/verification path (no SMTP on staging)."""
        slug = _unique_slug(spec["name"])

        with transaction.atomic():
            org = Organization.objects.create(
                name=spec["name"],
                slug=slug,
                fleet_size_band=spec["fleet_band"],
                # Not the 14-day register trial: staging lives longer than a
                # trial window and a premature expiry banner would just be noise.
                trial_ends_at=now + timedelta(days=90),
            )
            # Tenant rows need the org context (RLS + TenantModel.save) —
            # same sequence as accounts.register().
            db.set_organization_context(org.id)

            users: dict[str, User] = {}
            for member in spec["members"]:
                email = f"{member['local']}@{slug}.{SYNTHETIC_EMAIL_DOMAIN}"
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=member["first"],
                    last_name=member["last"],
                    # Pre-verified: staging has no SMTP, and login requires a
                    # verified address (services.login raises email_not_verified).
                    email_verified_at=now,
                )
                users[member["role"]] = user
                totals["users"] += 1

            owner_user = users.get("owner") or next(iter(users.values()))

            hq = None
            for branch_spec in spec["branches"]:
                branch = Branch.objects.create(
                    name=branch_spec["name"],
                    type=branch_spec["type"],
                    is_primary=branch_spec["primary"],
                )
                if branch_spec["primary"]:
                    hq = branch
                totals["branches"] += 1
            if hq is None:  # pragma: no cover — ORG_SPECS invariant
                raise CommandError(f"{spec['name']}: no primary branch in spec")

            for dept_name in spec["departments"]:
                Department.objects.create(branch=hq, name=dept_name)
                totals["departments"] += 1

            # 12 builtin roles + grants (needs permissions.0003 catalog).
            perm_services.seed_builtin_roles(org)
            org_services.get_or_create_settings(org.id)

            # Memberships: role lookups scoped to this org context.
            for member in spec["members"]:
                is_owner = member["role"] == "owner"
                Membership.objects.create(
                    organization=org,
                    user=users[member["role"]],
                    role=Role.objects.get(name=member["role"]),
                    status=Membership.Status.ACTIVE,
                    # The owner creates the org directly (as in register());
                    # everyone else was invited by them.
                    invited_by=None if is_owner else owner_user,
                )
                totals["memberships"] += 1

            # One pending invitation so the "Pending invitations" screen has
            # real rows. The raw token is discarded (it would only arrive by
            # email, which staging cannot send — see STAGING_READINESS.md).
            org_services.create_invitation(
                email=f"{spec['invite']['local']}@{slug}.{SYNTHETIC_EMAIL_DOMAIN}",
                role_id=Role.objects.get(name=spec["invite"]["role"]).id,
                invited_by_id=owner_user.id,
                organization_id=org.id,
            )
            totals["invitations"] += 1

            audit.record(
                action="staging.seeded",
                object_type="organization",
                object_id=org.id,
                organization_id=org.id,
                actor=owner_user,
                actor_email=owner_user.email,
                after={"synthetic": True, "users": len(users)},
            )

            db.set_organization_context(None)
            totals["organizations"] += 1
