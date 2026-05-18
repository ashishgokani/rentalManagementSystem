import uuid
import enum
from sqlalchemy import Column, Enum, ForeignKey, Float, DateTime, String, Integer, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class QuotationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT" # Kept for backward compatibility
    REQUESTED = "REQUESTED"
    REVIEWED = "REVIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CONFIRMED = "CONFIRMED" # Kept for backward compatibility if needed, or alias to ACCEPTED
    ORDERED = "ORDERED"


class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    product_name = Column(String)
    quantity = Column(Integer, default=1)
    rental_period_type = Column(String)  # hour, day, week, custom
    rental_start_date = Column(DateTime)
    rental_end_date = Column(DateTime)
    unit_price = Column(Float)
    total_price = Column(Float)

    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number = Column(String, unique=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(Enum(QuotationStatus), default=QuotationStatus.DRAFT)
    
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=18)  # GST 18%
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    
    valid_until = Column(DateTime)
    notes = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    lines = relationship("QuotationLine", back_populates="quotation", cascade="all, delete-orphan")

