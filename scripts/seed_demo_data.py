"""Seed the IQueue database with Mindanao demo data.

Creates 1 tenant, 6 bus routes (matching trained forecasting models),
12 buses (2 per route), and 1 demo passenger.  Idempotent — safe to
run multiple times.

Usage:
    python scripts/seed_demo_data.py              # seed PostgreSQL
    python scripts/seed_demo_data.py --check      # print what would be created

Requires DATABASE_URL in .env or environment.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

# Project root for .env loading and backend imports
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "backend"))  # for `app.db.base` etc.

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Deterministic UUIDs — same slug always produces the same UUID.
# Uses UUID v5 with the DNS namespace so the forecasting service can
# resolve route_id → slug without a DB lookup.
# ---------------------------------------------------------------------------
_ROUTE_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # DNS ns


def route_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(_ROUTE_NAMESPACE, f"iqueue.route.{slug}")


def tenant_uuid(name: str) -> uuid.UUID:
    return uuid.uuid5(_ROUTE_NAMESPACE, f"iqueue.tenant.{name}")


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

TENANT_ID = tenant_uuid("mindanao-bus-lines")
TENANT = {
    "id": TENANT_ID,
    "name": "Mindanao Bus Lines",
    "country": "PH",
}

ROUTES = [
    {"slug": "davao-cagayan", "origin": "Davao City", "destination": "Cagayan de Oro", "distance_km": 250.0},
    {"slug": "davao-cotabato", "origin": "Davao City", "destination": "Cotabato City", "distance_km": 200.0},
    {"slug": "davao-general-santos", "origin": "Davao City", "destination": "General Santos", "distance_km": 170.0},
    {"slug": "cagayan-iligan", "origin": "Cagayan de Oro", "destination": "Iligan City", "distance_km": 90.0},
    {"slug": "davao-butuan", "origin": "Davao City", "destination": "Butuan City", "distance_km": 280.0},
    {"slug": "cotabato-zambo", "origin": "Cotabato City", "destination": "Zamboanga City", "distance_km": 300.0},
]

BUSES = [
    # davao-cagayan
    {"plate": "DAV-001", "route_slug": "davao-cagayan", "capacity": 50},
    {"plate": "DAV-002", "route_slug": "davao-cagayan", "capacity": 45},
    # davao-cotabato
    {"plate": "DAV-003", "route_slug": "davao-cotabato", "capacity": 50},
    {"plate": "DAV-004", "route_slug": "davao-cotabato", "capacity": 40},
    # davao-general-santos
    {"plate": "GEN-001", "route_slug": "davao-general-santos", "capacity": 50},
    {"plate": "GEN-002", "route_slug": "davao-general-santos", "capacity": 45},
    # cagayan-iligan
    {"plate": "CDO-001", "route_slug": "cagayan-iligan", "capacity": 40},
    {"plate": "CDO-002", "route_slug": "cagayan-iligan", "capacity": 40},
    # davao-butuan
    {"plate": "BUT-001", "route_slug": "davao-butuan", "capacity": 50},
    {"plate": "BUT-002", "route_slug": "davao-butuan", "capacity": 45},
    # cotabato-zambo
    {"plate": "ZAM-001", "route_slug": "cotabato-zambo", "capacity": 40},
    {"plate": "ZAM-002", "route_slug": "cotabato-zambo", "capacity": 45},
]

PASSENGER_ID = uuid.uuid5(_ROUTE_NAMESPACE, "iqueue.passenger.demo-maria")
PASSENGER = {
    "id": PASSENGER_ID,
    "tenant_id": TENANT_ID,
    "name": "Maria Santos",
    "phone": "+639171234567",
    "language_pref": "fil",
    "travel_habits": "student",
    "accessibility_needs": False,
}

# Build route slug → UUID map for external use
ROUTE_SLUG_MAP: dict[str, uuid.UUID] = {
    r["slug"]: route_uuid(r["slug"]) for r in ROUTES
}

REVERSE_SLUG_MAP: dict[uuid.UUID, str] = {
    v: k for k, v in ROUTE_SLUG_MAP.items()
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def build_engine():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set. Check your .env file.")
        sys.exit(1)
    return create_async_engine(database_url, echo=False)


async def seed(engine, dry_run: bool = False) -> None:
    # Import all models so they register with Base.metadata
    import app.models  # noqa: F401 — triggers ORM registration
    from app.db.base import Base

    # Ensure schema exists (idempotent — won't recreate existing tables)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    print("✓ Schema ensured (tables created if missing)")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # --- Tenant ---
        existing = await session.execute(
            text("SELECT id FROM tenants WHERE id = :tid"), {"tid": TENANT_ID}
        )
        if existing.fetchone():
            print(f"✓ Tenant '{TENANT['name']}' already exists — skipping")
        else:
            if dry_run:
                print(f"  Would create tenant: {TENANT['name']}")
            else:
                await session.execute(
                    text(
                        "INSERT INTO tenants (id, name, country) VALUES (:id, :name, :country)"
                    ),
                    TENANT,
                )
                print(f"+ Created tenant: {TENANT['name']}")

        # --- Routes ---
        route_ids: dict[str, uuid.UUID] = {}
        for r in ROUTES:
            rid = route_uuid(r["slug"])
            route_ids[r["slug"]] = rid

            existing = await session.execute(
                text("SELECT id FROM bus_routes WHERE id = :rid"), {"rid": rid}
            )
            if existing.fetchone():
                print(f"  ✓ Route {r['origin']} → {r['destination']} exists — skipping")
                continue

            if dry_run:
                print(f"  Would create route: {r['origin']} → {r['destination']} ({r['distance_km']}km)")
                continue

            await session.execute(
                text(
                    "INSERT INTO bus_routes (id, tenant_id, origin, destination, distance_km) "
                    "VALUES (:id, :tenant_id, :origin, :destination, :distance_km)"
                ),
                {
                    "id": rid,
                    "tenant_id": TENANT_ID,
                    "origin": r["origin"],
                    "destination": r["destination"],
                    "distance_km": r["distance_km"],
                },
            )
            print(f"+ Created route: {r['origin']} → {r['destination']}")

        # --- Buses ---
        for b in BUSES:
            rid = route_ids[b["route_slug"]]
            # Check by plate (unique)
            existing = await session.execute(
                text("SELECT id FROM buses WHERE plate_number = :plate"),
                {"plate": b["plate"]},
            )
            if existing.fetchone():
                print(f"  ✓ Bus {b['plate']} exists — skipping")
                continue

            if dry_run:
                print(f"  Would create bus: {b['plate']} (capacity={b['capacity']}, route={b['route_slug']})")
                continue

            await session.execute(
                text(
                    "INSERT INTO buses (id, tenant_id, route_id, capacity, plate_number) "
                    "VALUES (gen_random_uuid(), :tenant_id, :route_id, :capacity, :plate_number)"
                ),
                {
                    "tenant_id": TENANT_ID,
                    "route_id": rid,
                    "capacity": b["capacity"],
                    "plate_number": b["plate"],
                },
            )
            print(f"+ Created bus: {b['plate']} ({b['route_slug']}, cap={b['capacity']})")

        # --- Passenger ---
        existing = await session.execute(
            text("SELECT id FROM passengers WHERE id = :pid"), {"pid": PASSENGER_ID}
        )
        if existing.fetchone():
            print(f"✓ Passenger '{PASSENGER['name']}' already exists — skipping")
        else:
            if dry_run:
                print(f"  Would create passenger: {PASSENGER['name']}")
            else:
                await session.execute(
                    text(
                        "INSERT INTO passengers (id, tenant_id, name, phone, language_pref, "
                        "travel_habits, accessibility_needs) "
                        "VALUES (:id, :tenant_id, :name, :phone, :language_pref, "
                        ":travel_habits, :accessibility_needs)"
                    ),
                    PASSENGER,
                )
                print(f"+ Created passenger: {PASSENGER['name']}")

        if not dry_run:
            await session.commit()

    # --- Print route slug map ---
    print("\nRoute slug → UUID mapping (copy this into forecasting config):")
    print("ROUTE_SLUG_MAP = {")
    for slug, rid in sorted(ROUTE_SLUG_MAP.items()):
        print(f'    "{slug}": UUID("{rid}"),')
    print("}")

    if dry_run:
        print("\n(Dry run — no changes made)")
    else:
        print(f"\nDone. Seeded {len(ROUTES)} routes, {len(BUSES)} buses, 1 passenger.")


async def _main_async(dry_run: bool) -> None:
    engine = build_engine()
    try:
        await seed(engine, dry_run=dry_run)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed IQueue database with Mindanao demo data")
    parser.add_argument("--check", action="store_true", help="Dry run — print what would be created")
    args = parser.parse_args()

    asyncio.run(_main_async(dry_run=args.check))


if __name__ == "__main__":
    main()
