import uuid
import enum
from sqlalchemy import Column, Enum, ForeignKey, DateTime, Float, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class TransactionType(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    currency = Column(String, default="INR", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", order_by="desc(WalletTransaction.created_at)", cascade="all, delete-orphan", passive_deletes=True)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.COMPLETED)
    
    # Reference to related entities (order, invoice, etc.)
    reference_type = Column(String, nullable=True)  # 'ORDER', 'INVOICE', 'REFUND', 'TOPUP'
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    
    description = Column(Text, nullable=True)
    payment_method = Column(String, nullable=True)  # 'UPI', 'CARD', 'BANK_TRANSFER', etc.
    external_reference = Column(String, nullable=True)  # Payment gateway reference
    
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
