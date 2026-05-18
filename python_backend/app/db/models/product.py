import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Float, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="category_rel")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    images = Column(JSON, default=list)  # List of image URLs
    
    is_rentable = Column(Boolean, default=True)
    rental_price_hourly = Column(Float, nullable=True)
    rental_price_daily = Column(Float, nullable=True)
    rental_price_weekly = Column(Float, nullable=True)
    
    cost_price = Column(Float, default=0)
    sales_price = Column(Float, default=0)
    
    quantity_on_hand = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    
    is_published = Column(Boolean, default=False)
    
    attributes = Column(JSON, default=list)  # List of {name, value} dicts
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    vendor = relationship("User", foreign_keys=[vendor_id])
    category_rel = relationship("Category", back_populates="products")

    @property
    def available_quantity(self):
        return self.quantity_on_hand - self.reserved_quantity

