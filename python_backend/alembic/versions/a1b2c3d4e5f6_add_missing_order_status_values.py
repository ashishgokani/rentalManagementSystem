"""Add missing order status enum values

Revision ID: a1b2c3d4e5f6
Revises: c8a2f3b4d5e6
Create Date: 2026-01-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c8a2f3b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing values to orderstatus enum
    # PostgreSQL allows adding values to existing enums
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PENDING'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PICKED_UP'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'RETURNED'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing values from enums easily
    # To truly downgrade, you'd need to recreate the enum type
    # For now, we'll leave the values in place
    pass
