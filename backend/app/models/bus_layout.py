"""BusLayout model — defines the physical seat grid for a bus type."""

from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BusLayout(Base):
    """Defines the physical seat grid for a bus type.

    One layout can be shared across many buses of the same model.
    Example: "Ceres Standard 54" with 14 rows × 4 columns.
    """

    __tablename__ = "bus_layouts"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    seats_per_row: Mapped[int] = mapped_column(Integer, nullable=False)
    aisle_after_col: Mapped[int] = mapped_column(Integer, default=2)
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    layout_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # layout_config stores per-seat overrides:
    # { "1A": {"type": "window", "is_near_exit": true, "is_accessibility": true}, ... }

    # Relationships
    buses: Mapped[list["Bus"]] = relationship("Bus", back_populates="layout")

    def __repr__(self) -> str:
        return (
            f"<BusLayout(id={self.id!s}, name='{self.name}', "
            f"capacity={self.total_capacity})>"
        )
