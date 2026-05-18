import uuid
import enum
from sqlalchemy import Column, Enum, ForeignKey, DateTime, Float, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PICKED_UP = "PICKED_UP"
    ACTIVE = "ACTIVE"
    RETURNED = "RETURNED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("rental_orders.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    product_name = Column(String)
    quantity = Column(Integer, default=1)
    rental_period_type = Column(String)
    rental_start_date = Column(DateTime)
    rental_end_date = Column(DateTime)
    unit_price = Column(Float)
    total_price = Column(Float)

    order = relationship("RentalOrder", back_populates="lines")
    product = relationship("Product")


class RentalOrder(Base):
    __tablename__ = "rental_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String, unique=True)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id"), nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=18)
    tax_amount = Column(Float, default=0)
    security_deposit = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    paid_amount = Column(Float, default=0)
    
    rental_start_date = Column(DateTime)
    rental_end_date = Column(DateTime)
    pickup_date = Column(DateTime, nullable=True)
    return_date = Column(DateTime, nullable=True)
    late_return_fee = Column(Float, default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    vendor = relationship("User", foreign_keys=[vendor_id])
    quotation = relationship("Quotation")
    lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")

