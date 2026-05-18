"""Add coupons table

Revision ID: g1h2i3j4k5l6
Revises: d40c0da79e77
Create Date: 2026-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'd40c0da79e77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create discount type enum
    discounttype = postgresql.ENUM('PERCENTAGE', 'FIXED', name='discounttype', create_type=False)
    discounttype.create(op.get_bind(), checkfirst=True)
    
    # Create coupons table
    op.create_table('coupons',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('discount_type', sa.Enum('PERCENTAGE', 'FIXED', name='discounttype'), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('min_order_amount', sa.Float(), nullable=True),
        sa.Column('max_discount_amount', sa.Float(), nullable=True),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('per_user_limit', sa.Integer(), nullable=True, default=1),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_table('coupons')
    
    # Drop enum type
    discounttype = postgresql.ENUM('PERCENTAGE', 'FIXED', name='discounttype')
    discounttype.drop(op.get_bind(), checkfirst=True)
