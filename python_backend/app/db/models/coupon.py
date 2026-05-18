import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class DiscountType(enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    
    discount_type = Column(Enum(DiscountType), nullable=False, default=DiscountType.PERCENTAGE)
    discount_value = Column(Float, nullable=False)  # Percentage or fixed amount
    
    min_order_amount = Column(Float, nullable=True)  # Minimum order to apply coupon
    max_discount_amount = Column(Float, nullable=True)  # Cap for percentage discounts
    
    usage_limit = Column(Integer, nullable=True)  # Total times coupon can be used
    usage_count = Column(Integer, default=0)  # How many times it's been used
    per_user_limit = Column(Integer, nullable=True, default=1)  # Times per user
    
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
