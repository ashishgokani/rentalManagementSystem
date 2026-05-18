"""Add wallet tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-31 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create transaction type enum if it doesn't exist
    op.execute("DO $$ BEGIN CREATE TYPE transactiontype AS ENUM ('CREDIT', 'DEBIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    
    # Create transaction status enum if it doesn't exist
    op.execute("DO $$ BEGIN CREATE TYPE transactionstatus AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    
    # Create wallets table
    op.execute("""
        CREATE TABLE wallets (
            id UUID PRIMARY KEY,
            user_id UUID UNIQUE NOT NULL REFERENCES users(id),
            balance FLOAT NOT NULL DEFAULT 0.0,
            currency VARCHAR NOT NULL DEFAULT 'INR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        )
    """)
    
    # Create wallet_transactions table
    op.execute("""
        CREATE TABLE wallet_transactions (
            id UUID PRIMARY KEY,
            wallet_id UUID NOT NULL REFERENCES wallets(id),
            transaction_type transactiontype NOT NULL,
            amount FLOAT NOT NULL,
            balance_before FLOAT NOT NULL,
            balance_after FLOAT NOT NULL,
            status transactionstatus DEFAULT 'COMPLETED',
            reference_type VARCHAR,
            reference_id UUID,
            description TEXT,
            payment_method VARCHAR,
            external_reference VARCHAR,
            created_at TIMESTAMP DEFAULT now()
        )
    """)
    
    # Create index for faster transaction lookups
    op.create_index('ix_wallet_transactions_wallet_id', 'wallet_transactions', ['wallet_id'])
    op.create_index('ix_wallet_transactions_created_at', 'wallet_transactions', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_wallet_transactions_created_at')
    op.drop_index('ix_wallet_transactions_wallet_id')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
    op.execute("DROP TYPE transactionstatus")
    op.execute("DROP TYPE transactiontype")
