"""ASEAN holiday calendar for surge prediction features.

Provides date ranges for major holidays across the four target countries.
Used by the cleaning pipeline to join binary surge-flag columns to the dataset.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class Holiday:
    """A single holiday event with a name, country, and date range."""

    name: str
    country: str  # ISO 3166-1 alpha-2
    start: dt.date
    end: dt.date

    def contains(self, d: dt.date) -> bool:
        """Check if a given date falls within this holiday's range."""
        return self.start <= d <= self.end

    @property
    def surge_multiplier(self) -> float:
        """Estimated passenger volume multiplier during this holiday."""
        return 1.5  # default: 50% more passengers


@dataclass(frozen=True)
class HolidaysASEAN:
    """Predefined ASEAN holiday calendar (2024–2026).

    Covers major holidays for Philippines (PH), Indonesia (ID),
    Vietnam (VN), and Malaysia (MY).
    """

    holidays: ClassVar[list[Holiday]] = [
        # --- Philippines ---
        Holiday("Holy Week (PH)", "PH", dt.date(2024, 3, 24), dt.date(2024, 3, 31)),
        Holiday("Holy Week (PH)", "PH", dt.date(2025, 4, 13), dt.date(2025, 4, 20)),
        Holiday("Holy Week (PH)", "PH", dt.date(2026, 3, 29), dt.date(2026, 4, 5)),
        Holiday("Christmas Season (PH)", "PH", dt.date(2024, 12, 20), dt.date(2025, 1, 5)),
        Holiday("Christmas Season (PH)", "PH", dt.date(2025, 12, 20), dt.date(2026, 1, 5)),
        Holiday("All Saints' Day (PH)", "PH", dt.date(2024, 10, 30), dt.date(2024, 11, 3)),
        Holiday("All Saints' Day (PH)", "PH", dt.date(2025, 10, 30), dt.date(2025, 11, 3)),
        Holiday("All Saints' Day (PH)", "PH", dt.date(2026, 10, 30), dt.date(2026, 11, 2)),
        # --- Indonesia ---
        Holiday("Eid al-Fitr (ID)", "ID", dt.date(2024, 4, 6), dt.date(2024, 4, 15)),
        Holiday("Eid al-Fitr (ID)", "ID", dt.date(2025, 3, 28), dt.date(2025, 4, 5)),
        Holiday("Eid al-Fitr (ID)", "ID", dt.date(2026, 3, 17), dt.date(2026, 3, 25)),
        Holiday("Eid al-Adha (ID)", "ID", dt.date(2024, 6, 14), dt.date(2024, 6, 20)),
        Holiday("Eid al-Adha (ID)", "ID", dt.date(2025, 6, 4), dt.date(2025, 6, 10)),
        Holiday("Eid al-Adha (ID)", "ID", dt.date(2026, 5, 24), dt.date(2026, 5, 30)),
        Holiday("Christmas & New Year (ID)", "ID", dt.date(2024, 12, 20), dt.date(2025, 1, 5)),
        Holiday("Christmas & New Year (ID)", "ID", dt.date(2025, 12, 20), dt.date(2026, 1, 5)),
        # --- Vietnam ---
        Holiday("Tết Nguyên Đán (VN)", "VN", dt.date(2024, 2, 7), dt.date(2024, 2, 15)),
        Holiday("Tết Nguyên Đán (VN)", "VN", dt.date(2025, 1, 25), dt.date(2025, 2, 3)),
        Holiday("Tết Nguyên Đán (VN)", "VN", dt.date(2026, 2, 14), dt.date(2026, 2, 22)),
        Holiday("Reunification Day + Labour (VN)", "VN", dt.date(2024, 4, 28), dt.date(2024, 5, 3)),
        Holiday("Reunification Day + Labour (VN)", "VN", dt.date(2025, 4, 28), dt.date(2025, 5, 3)),
        Holiday("Reunification Day + Labour (VN)", "VN", dt.date(2026, 4, 28), dt.date(2026, 5, 3)),
        Holiday("National Day (VN)", "VN", dt.date(2024, 8, 30), dt.date(2024, 9, 3)),
        Holiday("National Day (VN)", "VN", dt.date(2025, 8, 30), dt.date(2025, 9, 3)),
        Holiday("National Day (VN)", "VN", dt.date(2026, 8, 30), dt.date(2026, 9, 3)),
        # --- Malaysia ---
        Holiday("Hari Raya Aidilfitri (MY)", "MY", dt.date(2024, 4, 6), dt.date(2024, 4, 15)),
        Holiday("Hari Raya Aidilfitri (MY)", "MY", dt.date(2025, 3, 28), dt.date(2025, 4, 5)),
        Holiday("Hari Raya Aidilfitri (MY)", "MY", dt.date(2026, 3, 17), dt.date(2026, 3, 25)),
        Holiday("Chinese New Year (MY)", "MY", dt.date(2024, 2, 8), dt.date(2024, 2, 16)),
        Holiday("Chinese New Year (MY)", "MY", dt.date(2025, 1, 27), dt.date(2025, 2, 3)),
        Holiday("Chinese New Year (MY)", "MY", dt.date(2026, 2, 15), dt.date(2026, 2, 23)),
        Holiday("Deepavali (MY)", "MY", dt.date(2024, 10, 29), dt.date(2024, 11, 3)),
        Holiday("Deepavali (MY)", "MY", dt.date(2025, 10, 18), dt.date(2025, 10, 23)),
        Holiday("Deepavali (MY)", "MY", dt.date(2026, 11, 6), dt.date(2026, 11, 11)),
        Holiday("Merdeka Day (MY)", "MY", dt.date(2024, 8, 29), dt.date(2024, 9, 2)),
        Holiday("Merdeka Day (MY)", "MY", dt.date(2025, 8, 29), dt.date(2025, 9, 2)),
        Holiday("Merdeka Day (MY)", "MY", dt.date(2026, 8, 29), dt.date(2026, 9, 2)),
    ]

    @classmethod
    def is_holiday(cls, date: dt.date, country: str | None = None) -> bool:
        """Check if a date falls within any ASEAN holiday period."""
        for h in cls.holidays:
            if h.contains(date) and (country is None or h.country == country):
                return True
        return False

    @classmethod
    def get_holiday_name(cls, date: dt.date, country: str) -> str | None:
        """Get the holiday name for a given date and country."""
        for h in cls.holidays:
            if h.contains(date) and h.country == country:
                return h.name
        return None

    @classmethod
    def get_surge_multiplier(cls, date: dt.date, country: str) -> float:
        """Get the passenger surge multiplier for a date.

        Returns 1.5 during holidays, 1.0 on normal days.
        """
        for h in cls.holidays:
            if h.contains(date) and h.country == country:
                return h.surge_multiplier
        return 1.0

    @classmethod
    def list_country_holidays(
        cls, country: str, year: int | None = None
    ) -> list[Holiday]:
        """List all holidays for a specific country, optionally filtered by year."""
        result = [h for h in cls.holidays if h.country == country]
        if year is not None:
            result = [h for h in result if h.start.year == year or h.end.year == year]
        return result
