"""add_missing_invoice_status_enum_values

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-01-31 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing values to invoicestatus enum
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'DRAFT';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'SENT';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'PARTIAL';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'PAID';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'CANCELLED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    
    # Add missing values to paymentstatus enum
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'PENDING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'COMPLETED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'FAILED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'REFUNDED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    
    # Add missing values to paymentmethod enum
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'ONLINE';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'CARD';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'CASH';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    
    # Add missing values to quotationstatus enum
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE quotationstatus ADD VALUE IF NOT EXISTS 'DRAFT';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE quotationstatus ADD VALUE IF NOT EXISTS 'SENT';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE quotationstatus ADD VALUE IF NOT EXISTS 'CONFIRMED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE quotationstatus ADD VALUE IF NOT EXISTS 'CANCELLED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)


def downgrade() -> None:
    # Cannot remove enum values in PostgreSQL easily
    pass
