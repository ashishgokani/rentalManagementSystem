"""Add complete schema for rental management

Revision ID: c8a2f3b4d5e6
Revises: d7b91d90f77a
Create Date: 2026-01-31 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c8a2f3b4d5e6'
down_revision: Union[str, None] = 'd7b91d90f77a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create categories table
    op.create_table('categories',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Modify products table
    op.add_column('products', sa.Column('category_id', sa.UUID(), nullable=True))
    op.add_column('products', sa.Column('images', sa.JSON(), nullable=True))
    op.add_column('products', sa.Column('rental_price_hourly', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('rental_price_daily', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('rental_price_weekly', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('sales_price', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('reserved_quantity', sa.Integer(), nullable=True, default=0))
    op.add_column('products', sa.Column('attributes', sa.JSON(), nullable=True))
    op.add_column('products', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('products', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.create_foreign_key('fk_products_category', 'products', 'categories', ['category_id'], ['id'])
    
    # Modify quotations table
    op.add_column('quotations', sa.Column('quotation_number', sa.String(), nullable=True))
    op.add_column('quotations', sa.Column('subtotal', sa.Float(), nullable=True))
    op.add_column('quotations', sa.Column('tax_rate', sa.Float(), nullable=True, default=18))
    op.add_column('quotations', sa.Column('tax_amount', sa.Float(), nullable=True))
    op.add_column('quotations', sa.Column('valid_until', sa.DateTime(), nullable=True))
    op.add_column('quotations', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('quotations', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('quotations', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    
    # Create quotation_lines table
    op.create_table('quotation_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('quotation_id', sa.UUID(), nullable=True),
        sa.Column('product_id', sa.UUID(), nullable=True),
        sa.Column('product_name', sa.String(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True, default=1),
        sa.Column('rental_period_type', sa.String(), nullable=True),
        sa.Column('rental_start_date', sa.DateTime(), nullable=True),
        sa.Column('rental_end_date', sa.DateTime(), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=True),
        sa.Column('total_price', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Modify rental_orders table
    op.add_column('rental_orders', sa.Column('order_number', sa.String(), nullable=True))
    op.add_column('rental_orders', sa.Column('subtotal', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('tax_rate', sa.Float(), nullable=True, default=18))
    op.add_column('rental_orders', sa.Column('tax_amount', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('security_deposit', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('total_amount', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('paid_amount', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('rental_start_date', sa.DateTime(), nullable=True))
    op.add_column('rental_orders', sa.Column('rental_end_date', sa.DateTime(), nullable=True))
    op.add_column('rental_orders', sa.Column('pickup_date', sa.DateTime(), nullable=True))
    op.add_column('rental_orders', sa.Column('return_date', sa.DateTime(), nullable=True))
    op.add_column('rental_orders', sa.Column('late_return_fee', sa.Float(), nullable=True))
    op.add_column('rental_orders', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('rental_orders', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('rental_orders', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    
    # Create order_lines table
    op.create_table('order_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.UUID(), nullable=True),
        sa.Column('product_id', sa.UUID(), nullable=True),
        sa.Column('product_name', sa.String(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True, default=1),
        sa.Column('rental_period_type', sa.String(), nullable=True),
        sa.Column('rental_start_date', sa.DateTime(), nullable=True),
        sa.Column('rental_end_date', sa.DateTime(), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=True),
        sa.Column('total_price', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['rental_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Modify invoices table
    op.add_column('invoices', sa.Column('invoice_number', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('customer_id', sa.UUID(), nullable=True))
    op.add_column('invoices', sa.Column('subtotal', sa.Float(), nullable=True))
    op.add_column('invoices', sa.Column('tax_rate', sa.Float(), nullable=True, default=18))
    op.add_column('invoices', sa.Column('tax_amount', sa.Float(), nullable=True))
    op.add_column('invoices', sa.Column('paid_amount', sa.Float(), nullable=True))
    op.add_column('invoices', sa.Column('due_date', sa.DateTime(), nullable=True))
    op.add_column('invoices', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('invoices', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.create_foreign_key('fk_invoices_customer', 'invoices', 'users', ['customer_id'], ['id'])
    
    # Create invoice_lines table
    op.create_table('invoice_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True, default=1),
        sa.Column('unit_price', sa.Float(), nullable=True),
        sa.Column('total_price', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create payments table
    op.create_table('payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('method', sa.Enum('ONLINE', 'CARD', 'BANK_TRANSFER', 'CASH', name='paymentmethod'), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', name='paymentstatus'), nullable=True),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop tables and columns in reverse order
    op.drop_table('payments')
    op.drop_table('invoice_lines')
    op.drop_constraint('fk_invoices_customer', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'updated_at')
    op.drop_column('invoices', 'created_at')
    op.drop_column('invoices', 'notes')
    op.drop_column('invoices', 'due_date')
    op.drop_column('invoices', 'paid_amount')
    op.drop_column('invoices', 'tax_amount')
    op.drop_column('invoices', 'tax_rate')
    op.drop_column('invoices', 'subtotal')
    op.drop_column('invoices', 'customer_id')
    op.drop_column('invoices', 'invoice_number')
    
    op.drop_table('order_lines')
    op.drop_column('rental_orders', 'updated_at')
    op.drop_column('rental_orders', 'created_at')
    op.drop_column('rental_orders', 'notes')
    op.drop_column('rental_orders', 'late_return_fee')
    op.drop_column('rental_orders', 'return_date')
    op.drop_column('rental_orders', 'pickup_date')
    op.drop_column('rental_orders', 'rental_end_date')
    op.drop_column('rental_orders', 'rental_start_date')
    op.drop_column('rental_orders', 'paid_amount')
    op.drop_column('rental_orders', 'total_amount')
    op.drop_column('rental_orders', 'security_deposit')
    op.drop_column('rental_orders', 'tax_amount')
    op.drop_column('rental_orders', 'tax_rate')
    op.drop_column('rental_orders', 'subtotal')
    op.drop_column('rental_orders', 'order_number')
    
    op.drop_table('quotation_lines')
    op.drop_column('quotations', 'updated_at')
    op.drop_column('quotations', 'created_at')
    op.drop_column('quotations', 'notes')
    op.drop_column('quotations', 'valid_until')
    op.drop_column('quotations', 'tax_amount')
    op.drop_column('quotations', 'tax_rate')
    op.drop_column('quotations', 'subtotal')
    op.drop_column('quotations', 'quotation_number')
    
    op.drop_constraint('fk_products_category', 'products', type_='foreignkey')
    op.drop_column('products', 'updated_at')
    op.drop_column('products', 'created_at')
    op.drop_column('products', 'attributes')
    op.drop_column('products', 'reserved_quantity')
    op.drop_column('products', 'sales_price')
    op.drop_column('products', 'rental_price_weekly')
    op.drop_column('products', 'rental_price_daily')
    op.drop_column('products', 'rental_price_hourly')
    op.drop_column('products', 'images')
    op.drop_column('products', 'category_id')
    
    op.drop_table('categories')
