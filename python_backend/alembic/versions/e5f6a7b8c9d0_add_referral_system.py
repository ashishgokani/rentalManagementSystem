"""Add referral system

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-01-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add referral columns to users table
    op.add_column('users', sa.Column('referral_code', sa.String(length=8), nullable=True))
    op.add_column('users', sa.Column('referred_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('referral_used', sa.Boolean(), server_default='false', nullable=False))
    
    # Create unique index on referral_code
    op.create_index('ix_users_referral_code', 'users', ['referral_code'], unique=True)
    
    # Create foreign key for referred_by
    op.create_foreign_key(
        'fk_users_referred_by',
        'users', 'users',
        ['referred_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop foreign key
    op.drop_constraint('fk_users_referred_by', 'users', type_='foreignkey')
    
    # Drop index
    op.drop_index('ix_users_referral_code', table_name='users')
    
    # Drop columns
    op.drop_column('users', 'referral_used')
    op.drop_column('users', 'referred_by')
    op.drop_column('users', 'referral_code')
