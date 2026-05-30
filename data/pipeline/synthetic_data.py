"""Synthetic data generator for ASEAN inter-provincial bus terminal data.

Generates realistic fake data for the IQueue platform when real LTFRB or
equivalent datasets are unavailable. All outputs are written as CSV files
to the data/raw/ directory and designed to flow through clean.py.

Usage:
    python -m data.pipeline.synthetic_data [--output-dir data/raw/]
"""

from __future__ import annotations

import argparse
import csv
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from data.pipeline.holidays import HolidaysASEAN

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RANDOM_SEED = 42
TOTAL_PASSENGERS = 500
TOTAL_DAYS = 90  # days of booking history
BOOKINGS_PER_DAY_RANGE = (15, 50)

# --- Country configurations ---
COUNTRIES = {
    "PH": "Philippines",
    "ID": "Indonesia",
    "VN": "Vietnam",
    "MY": "Malaysia",
}

# --- Tenant definitions ---
TENANTS: list[dict[str, Any]] = [
    {"id": str(uuid.uuid4()), "name": "Davao Metro Shuttle", "country": "PH"},
    {"id": str(uuid.uuid4()), "name": "Jakarta Express", "country": "ID"},
    {"id": str(uuid.uuid4()), "name": "Saigon Lines", "country": "VN"},
    {"id": str(uuid.uuid4()), "name": "KL Transit", "country": "MY"},
]

# --- Route definitions (real city pairs) ---
ROUTES: list[dict[str, Any]] = [
    # Philippines
    {"origin": "Manila", "destination": "Davao", "distance_km": 968, "country": "PH"},
    {"origin": "Manila", "destination": "Cebu", "distance_km": 572, "country": "PH"},
    {"origin": "Davao", "destination": "Cagayan de Oro", "distance_km": 248, "country": "PH"},
    {"origin": "Cebu", "destination": "Bacolod", "distance_km": 120, "country": "PH"},
    # Indonesia
    {"origin": "Jakarta", "destination": "Bandung", "distance_km": 152, "country": "ID"},
    {"origin": "Jakarta", "destination": "Surabaya", "distance_km": 790, "country": "ID"},
    {"origin": "Jakarta", "destination": "Yogyakarta", "distance_km": 530, "country": "ID"},
    # Vietnam
    {"origin": "Ho Chi Minh City", "destination": "Hanoi", "distance_km": 1610, "country": "VN"},
    {"origin": "Ho Chi Minh City", "destination": "Da Nang", "distance_km": 850, "country": "VN"},
    {"origin": "Hanoi", "destination": "Hai Phong", "distance_km": 120, "country": "VN"},
    # Malaysia
    {"origin": "Kuala Lumpur", "destination": "Penang", "distance_km": 354, "country": "MY"},
    {"origin": "Kuala Lumpur", "destination": "Johor Bahru", "distance_km": 328, "country": "MY"},
]

# --- Passenger name pools per country ---
NAMES: dict[str, dict[str, list[str]]] = {
    "PH": {
        "first": [
            "Juan", "Maria", "Jose", "Andres", "Elena", "Carlos", "Rosa",
            "Pedro", "Luz", "Antonio", "Angel", "Sofia", "Miguel", "Isabel",
            "Rafael", "Carmen", "Diego", "Teresa", "Gabriel", "Ana",
        ],
        "last": [
            "Dela Cruz", "Santos", "Reyes", "Gonzales", "Bautista", "Mendoza",
            "Aquino", "Torres", "Garcia", "Ramos", "Flores", "Rivera",
            "Morales", "Ong", "Castillo", "Velasco", "Cruz", "Lim",
        ],
    },
    "ID": {
        "first": [
            "Budi", "Siti", "Agus", "Dewi", "Hendra", "Rini", "Adi",
            "Putri", "Wayan", "Ratna", "Hadi", "Indah", "Bambang", "Sri",
            "Anto", "Fitri", "Eko", "Lestari", "Yusuf", "Mega",
        ],
        "last": [
            "Santoso", "Wijaya", "Siregar", "Prasetyo", "Kusuma", "Hartono",
            "Susanto", "Nugroho", "Utami", "Hidayat", "Putra", "Wibowo",
            "Saputra", "Permata", "Gunawan", "Halim", "Setiawan",
        ],
    },
    "VN": {
        "first": [
            "Nguyen", "Tran", "Le", "Pham", "Hoang", "Huynh", "Phan",
            "Vu", "Vo", "Dang", "Bui", "Do", "Ho", "Ngo", "Duong",
        ],
        "last": [
            "Van A", "Thi B", "Van C", "Thi D", "Van E", "Thi F",
            "Van G", "Thi H", "Van K", "Thi L", "Van M", "Thi N",
            "Van P", "Thi Q", "Van T",
        ],
    },
    "MY": {
        "first": [
            "Ahmad", "Siti", "Muhammad", "Nur", "Mohd", "Farah", "Syafiq",
            "Aishah", "Hafiz", "Zainab", "Amir", "Siti", "Rashid", "Nor",
            "Faisal", "Alya", "Danish", "Hana", "Irfan", "Aina",
        ],
        "last": [
            "Abdullah", "Ismail", "Hassan", "Ibrahim", "Yusof", "Tan",
            "Ong", "Lee", "Wong", "Rahman", "Ali", "Mahmood", "Salleh",
            "Rashid", "Aziz", "Hamid", "Chong", "Goh",
        ],
    },
}

# --- Language preferences per country ---
LANGUAGES = {
    "PH": {"fil": 0.60, "en": 0.35, "ceb": 0.05},
    "ID": {"id": 0.85, "en": 0.10, "jv": 0.05},
    "VN": {"vi": 0.90, "en": 0.08, "fr": 0.02},
    "MY": {"ms": 0.60, "en": 0.25, "zh": 0.10, "ta": 0.05},
}

# --- Travel habits ---
TRAVEL_HABITS = ["business", "leisure", "student", "family", "commuter"]

# --- Lifestyle interests ---
INTERESTS_POOL = [
    "sports", "music", "reading", "gaming", "cooking",
    "travel", "photography", "fitness", "movies", "technology",
    "nature", "food", "art", "fashion", "history",
]

# --- ASEAN holiday surge factors ---
# Base daily volume per route (weekday average)
BASE_DAILY_VOLUME: dict[float, int] = {
    0: 80,   # short routes (<200km)
    1: 120,  # medium routes (200-800km)
    2: 180,  # long routes (>800km)
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed() -> None:
    random.seed(RANDOM_SEED)


def _weighted_choice(weights: dict[str, float]) -> str:
    """Pick a key from a dict of {key: probability}."""
    items = list(weights.items())
    r = random.random()
    cumulative = 0.0
    for key, prob in items:
        cumulative += prob
        if r <= cumulative:
            return key
    return items[-1][0]


def _pick(items: list[Any]) -> Any:
    return random.choice(items)


def _pick_n(items: list[Any], n: int) -> list[Any]:
    return random.sample(items, min(n, len(items)))


def _generate_phone(country: str) -> str:
    """Generate a realistic phone number per country format."""
    prefixes = {
        "PH": "+63 9{:02d} {:03d} {:04d}",
        "ID": "+62 8{:02d} {:04d} {:04d}",
        "VN": "+84 9{:01d} {:04d} {:03d}",
        "MY": "+60 1{:01d}-{:04d} {:04d}",
    }
    fmt = prefixes.get(country, "+00 000 000 0000")
    return fmt.format(
        random.randint(10, 99),
        random.randint(100, 9999),
        random.randint(100, 9999),
    )


def _get_tenant_for_country(country: str) -> dict[str, Any]:
    for t in TENANTS:
        if t["country"] == country:
            return t
    return TENANTS[0]


def _base_volume(route: dict[str, Any]) -> int:
    """Estimate base daily passenger volume for a route."""
    d = route["distance_km"]
    if d < 200:
        return 80
    elif d < 800:
        return 120
    else:
        return 180


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_tenants(output_dir: Path) -> list[dict[str, Any]]:
    """Write tenants.csv and return tenant records."""
    rows = []
    for t in TENANTS:
        rows.append({
            "id": t["id"],
            "name": t["name"],
            "country": t["country"],
            "created_at": "2026-01-01T00:00:00+00:00",
        })

    _write_csv(output_dir / "tenants.csv", rows)
    return rows


def generate_routes(
    output_dir: Path, tenants: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Write bus_routes.csv and return route records, each assigned to its country tenant."""
    rows = []
    for i, r in enumerate(ROUTES):
        tenant = _get_tenant_for_country(r["country"])
        rows.append({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant["id"],
            "origin": r["origin"],
            "destination": r["destination"],
            "distance_km": r["distance_km"],
            "created_at": "2026-01-01T00:00:00+00:00",
        })

    _write_csv(output_dir / "bus_routes.csv", rows)
    return rows


def generate_buses(
    output_dir: Path,
    tenants: list[dict[str, Any]],
    routes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Write buses.csv with 3-5 buses per route."""
    rows = []
    plate_counters: dict[str, int] = {}
    route_by_id = {r["id"]: r for r in routes}

    for route in routes:
        tenant = _get_tenant_for_country(route.get("country", ""))
        country = tenant["country"]
        num_buses = random.randint(3, 5)
        capacity = random.choice([40, 45, 50, 55, 60])

        for _ in range(num_buses):
            plate_counters[country] = plate_counters.get(country, 0) + 1
            plate = f"{country}-{plate_counters[country]:04d}"

            rows.append({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant["id"],
                "route_id": route["id"],
                "capacity": capacity,
                "plate_number": plate,
                "created_at": "2026-01-01T00:00:00+00:00",
            })

    _write_csv(output_dir / "buses.csv", rows)
    return rows


def generate_passengers(
    output_dir: Path,
    tenants: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Write passengers.csv (500 passengers across 4 countries)."""
    rows = []
    per_country = TOTAL_PASSENGERS // len(COUNTRIES)

    for tenant in tenants:
        country = tenant["country"]
        names_pool = NAMES[country]
        for i in range(per_country):
            first = _pick(names_pool["first"])
            last = _pick(names_pool["last"])
            lang = _weighted_choice(LANGUAGES[country])
            habit = _pick(TRAVEL_HABITS)
            interests = ",".join(_pick_n(INTERESTS_POOL, random.randint(1, 4)))

            rows.append({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant["id"],
                "name": f"{first} {last}",
                "phone": _generate_phone(country),
                "language_pref": lang,
                "travel_habits": habit,
                "lifestyle_interests": interests,
                "accessibility_needs": str(random.random() < 0.03).lower(),
                "created_at": "2026-01-01T00:00:00+00:00",
            })

    _write_csv(output_dir / "passengers.csv", rows)
    return rows


def generate_bookings(
    output_dir: Path,
    passengers: list[dict[str, Any]],
    buses: list[dict[str, Any]],
    routes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Write bookings.csv spanning 90 days with seasonal + holiday patterns."""
    passenger_by_tenant: dict[str, list[dict[str, Any]]] = {}
    for p in passengers:
        passenger_by_tenant.setdefault(p["tenant_id"], []).append(p)

    bus_by_route: dict[str, list[dict[str, Any]]] = {}
    for b in buses:
        bus_by_route.setdefault(b["route_id"], []).append(b)

    route_by_id = {r["id"]: r for r in routes}
    tenant_by_id = {t["id"]: t for t in TENANTS}
    first_date = date(2026, 1, 1)

    rows = []
    seats_assigned: dict[tuple[str, date], set[str]] = {}
    # Track per-route passenger_id+date combos for dedup testing
    seen_combos: set[tuple[str, str, date]] = set()

    for day_offset in range(TOTAL_DAYS):
        d = first_date + timedelta(days=day_offset)
        # Weekend boost
        is_weekend = d.weekday() >= 5

        for route in routes:
            tenant = tenant_by_id.get(
                _get_tenant_for_country(route.get("country", ""))["id"]
            )
            if not tenant:
                continue

            country = tenant["country"]

            # Base volume adjusted by day-of-week and holiday surge
            base = _base_volume(route)
            holiday_mult = HolidaysASEAN.get_surge_multiplier(d, country)
            weekend_mult = 1.3 if is_weekend else 1.0
            volume = int(base * holiday_mult * weekend_mult * random.gauss(1.0, 0.15))
            volume = max(5, min(volume, 200))

            route_buses = bus_by_route.get(route["id"], [])
            if not route_buses:
                continue

            route_passengers = passenger_by_tenant.get(tenant["id"], [])
            if not route_passengers:
                continue

            for _ in range(volume):
                bus = _pick(route_buses)
                passenger = _pick(route_passengers)
                key = (bus["id"], d)
                passenger_key = (passenger["id"], route["id"], d)

                # Skip duplicate passenger+route+date combos
                if passenger_key in seen_combos:
                    continue
                seen_combos.add(passenger_key)

                if key not in seats_assigned:
                    seats_assigned[key] = set()

                taken = seats_assigned[key]
                capacity = int(bus["capacity"])
                if len(taken) >= capacity:
                    continue

                # Find an available seat
                seat_num = 1
                while str(seat_num) in taken and seat_num <= capacity:
                    seat_num += 1
                if seat_num > capacity:
                    continue

                taken.add(str(seat_num))

                # Boarding window: 15-min slot, front rows board first
                # Simulate departure at 08:00 + row-based boarding
                departure_hour = random.choice([6, 8, 10, 14, 18, 22])
                departure = datetime(
                    d.year, d.month, d.day, departure_hour, 0,
                    tzinfo=timezone.utc,
                )
                # Row number roughly from seat number
                row = (seat_num - 1) // 4 + 1
                window_start = departure + timedelta(minutes=row * 3)
                window_end = window_start + timedelta(minutes=15)

                rows.append({
                    "id": str(uuid.uuid4()),
                    "passenger_id": passenger["id"],
                    "bus_id": bus["id"],
                    "seat_number": str(seat_num),
                    "boarding_window_start": window_start.isoformat(),
                    "boarding_window_end": window_end.isoformat(),
                    "status": _pick(["confirmed", "confirmed", "confirmed", "boarded", "cancelled"]),
                    "departure_date": departure.isoformat(),
                    "qr_token": "",  # filled by QR service in Sprint 2
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90))).isoformat(),
                })

    _write_csv(output_dir / "bookings.csv", rows)
    return rows


def generate_forecasts(
    output_dir: Path,
    routes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Write surge_forecasts.csv — 7-day ahead predictions per route."""
    rows = []
    start = date.today() + timedelta(days=1)

    for route in routes:
        tenant = _get_tenant_for_country(route.get("country", ""))
        country = tenant["country"]
        base = _base_volume(route)

        for day_offset in range(7):
            d = start + timedelta(days=day_offset)
            holiday_mult = HolidaysASEAN.get_surge_multiplier(d, country)
            is_weekend = d.weekday() >= 5
            weekend_mult = 1.3 if is_weekend else 1.0

            surge_prob = min(
                0.95,
                (holiday_mult - 1.0) * 1.5 + (0.2 if is_weekend else 0.0) + random.uniform(-0.1, 0.15),
            )
            surge_prob = max(0.05, surge_prob)

            predicted = int(base * holiday_mult * weekend_mult * random.uniform(0.85, 1.15))

            rows.append({
                "id": str(uuid.uuid4()),
                "route_id": route["id"],
                "forecast_date": d.isoformat(),
                "surge_probability": round(surge_prob, 4),
                "predicted_volume": predicted,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    _write_csv(output_dir / "surge_forecasts.csv", rows)
    return rows


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _write_csv(filepath: Path, rows: list[dict[str, Any]]) -> None:
    """Write a list of dicts to a CSV file."""
    if not rows:
        print(f"  ⚠ Skipping {filepath.name}: no data")
        return

    filepath.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ {filepath.name}: {len(rows):,} rows")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate synthetic ASEAN bus terminal data for IQueue."
    )
    parser.add_argument(
        "--output-dir",
        default="data/raw/",
        type=Path,
        help="Directory to write CSV output files (default: data/raw/)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=RANDOM_SEED,
        help=f"Random seed for reproducibility (default: {RANDOM_SEED})",
    )
    args = parser.parse_args()

    # Set seed for reproducibility
    random.seed(args.seed)
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🎲 Generating synthetic IQueue data → {output_dir}/")
    print(f"   Random seed: {args.seed}\n")

    # 1. Tenants
    print("[1/6] Tenants")
    tenants = generate_tenants(output_dir)

    # 2. Routes
    print("[2/6] Bus Routes")
    routes = generate_routes(output_dir, tenants)

    # 3. Buses
    print("[3/6] Buses")
    buses = generate_buses(output_dir, tenants, routes)

    # 4. Passengers
    print("[4/6] Passengers")
    passengers = generate_passengers(output_dir, tenants)

    # 5. Bookings
    print("[5/6] Bookings")
    bookings = generate_bookings(output_dir, passengers, buses, routes)

    # 6. Surge Forecasts
    print("[6/6] Surge Forecasts")
    forecasts = generate_forecasts(output_dir, routes)

    # Summary
    print(f"\n✅ Done! Generated synthetic data in {output_dir}/")
    print(f"   Tenants:        {len(tenants)}")
    print(f"   Bus Routes:     {len(routes)}")
    print(f"   Buses:          {len(buses)}")
    print(f"   Passengers:     {len(passengers)}")
    print(f"   Bookings:       {len(bookings)}")
    print(f"   Forecasts:      {len(forecasts)}")
    print(f"\nNext step: python data/pipeline/clean.py --source synthetic\n")


if __name__ == "__main__":
    main()
