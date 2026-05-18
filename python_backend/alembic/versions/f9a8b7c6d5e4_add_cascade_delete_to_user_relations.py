"""add cascade delete to user relations

Revision ID: f9a8b7c6d5e4
Revises: e5f6a7b8c9d0
Create Date: 2026-01-31 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9a8b7c6d5e4'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    # Drop and recreate foreign keys with CASCADE delete for user-related tables
    
    # Wallets - user_id
    op.drop_constraint('wallets_user_id_fkey', 'wallets', type_='foreignkey')
    op.create_foreign_key('wallets_user_id_fkey', 'wallets', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    
    # Wallet transactions - wallet_id (cascades through wallet deletion)
    op.drop_constraint('wallet_transactions_wallet_id_fkey', 'wallet_transactions', type_='foreignkey')
    op.create_foreign_key('wallet_transactions_wallet_id_fkey', 'wallet_transactions', 'wallets', ['wallet_id'], ['id'], ondelete='CASCADE')
    
    # Products - vendor_id
    op.drop_constraint('products_vendor_id_fkey', 'products', type_='foreignkey')
    op.create_foreign_key('products_vendor_id_fkey', 'products', 'users', ['vendor_id'], ['id'], ondelete='CASCADE')
    
    # Quotations - customer_id
    op.drop_constraint('quotations_customer_id_fkey', 'quotations', type_='foreignkey')
    op.create_foreign_key('quotations_customer_id_fkey', 'quotations', 'users', ['customer_id'], ['id'], ondelete='CASCADE')
    
    # Rental orders - customer_id and vendor_id
    op.drop_constraint('rental_orders_customer_id_fkey', 'rental_orders', type_='foreignkey')
    op.create_foreign_key('rental_orders_customer_id_fkey', 'rental_orders', 'users', ['customer_id'], ['id'], ondelete='CASCADE')
    
    op.drop_constraint('rental_orders_vendor_id_fkey', 'rental_orders', type_='foreignkey')
    op.create_foreign_key('rental_orders_vendor_id_fkey', 'rental_orders', 'users', ['vendor_id'], ['id'], ondelete='CASCADE')
    
    # Invoices - customer_id (uses different naming convention)
    op.drop_constraint('fk_invoices_customer', 'invoices', type_='foreignkey')
    op.create_foreign_key('fk_invoices_customer', 'invoices', 'users', ['customer_id'], ['id'], ondelete='CASCADE')


def downgrade():
    # Revert to original foreign keys without CASCADE
    
    # Invoices - customer_id
    op.drop_constraint('fk_invoices_customer', 'invoices', type_='foreignkey')
    op.create_foreign_key('fk_invoices_customer', 'invoices', 'users', ['customer_id'], ['id'])
    
    # Rental orders - customer_id and vendor_id
    op.drop_constraint('rental_orders_vendor_id_fkey', 'rental_orders', type_='foreignkey')
    op.create_foreign_key('rental_orders_vendor_id_fkey', 'rental_orders', 'users', ['vendor_id'], ['id'])
    
    op.drop_constraint('rental_orders_customer_id_fkey', 'rental_orders', type_='foreignkey')
    op.create_foreign_key('rental_orders_customer_id_fkey', 'rental_orders', 'users', ['customer_id'], ['id'])
    
    # Quotations - customer_id
    op.drop_constraint('quotations_customer_id_fkey', 'quotations', type_='foreignkey')
    op.create_foreign_key('quotations_customer_id_fkey', 'quotations', 'users', ['customer_id'], ['id'])
    
    # Products - vendor_id
    op.drop_constraint('products_vendor_id_fkey', 'products', type_='foreignkey')
    op.create_foreign_key('products_vendor_id_fkey', 'products', 'users', ['vendor_id'], ['id'])
    
    # Wallet transactions - wallet_id
    op.drop_constraint('wallet_transactions_wallet_id_fkey', 'wallet_transactions', type_='foreignkey')
    op.create_foreign_key('wallet_transactions_wallet_id_fkey', 'wallet_transactions', 'wallets', ['wallet_id'], ['id'])
    
    # Wallets - user_id
    op.drop_constraint('wallets_user_id_fkey', 'wallets', type_='foreignkey')
    op.create_foreign_key('wallets_user_id_fkey', 'wallets', 'users', ['user_id'], ['id'])
