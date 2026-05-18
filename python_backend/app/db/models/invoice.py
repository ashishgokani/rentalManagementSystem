import uuid
import enum
from sqlalchemy import Column, Enum, Float, ForeignKey, DateTime, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    ONLINE = "ONLINE"
    CARD = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    CASH = "CASH"
    WALLET = "WALLET"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"))
    description = Column(String)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float)
    total_price = Column(Float)

    invoice = relationship("Invoice", back_populates="lines")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String, unique=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("rental_orders.id"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=18)
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    paid_amount = Column(Float, default=0)
    
    due_date = Column(DateTime)
    notes = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    order = relationship("RentalOrder")
    customer = relationship("User", foreign_keys=[customer_id])
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"))
    amount = Column(Float)
    method = Column(Enum(PaymentMethod))
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice", back_populates="payments")

