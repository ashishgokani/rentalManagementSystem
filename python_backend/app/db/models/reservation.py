import uuid, enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class ReservationStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RELEASED = "RELEASED"

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    order_id = Column(UUID(as_uuid=True), ForeignKey("rental_orders.id"))
    reserved_from = Column(DateTime)
    reserved_to = Column(DateTime)
    quantity = Column(Integer)
    status = Column(Enum(ReservationStatus), default=ReservationStatus.ACTIVE)
