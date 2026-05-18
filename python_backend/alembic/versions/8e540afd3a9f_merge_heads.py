"""merge heads

Revision ID: 8e540afd3a9f
Revises: 508dc6cb0819, 80a7856e3fa6
Create Date: 2026-01-31 21:40:30.826735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e540afd3a9f'
down_revision: Union[str, None] = ('508dc6cb0819', '80a7856e3fa6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
