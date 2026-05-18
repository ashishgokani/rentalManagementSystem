from sqlalchemy import (
    Column,
    String,
    Boolean,
    Enum,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
import secrets
import string

from app.db.base import Base


def generate_referral_code(length: int = 8) -> str:
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


class UserRole(enum.Enum):
    CUSTOMER = "CUSTOMER"
    VENDOR = "VENDOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)  # Added phone number
    password_hash = Column(String, nullable=False)

    role = Column(Enum(UserRole), nullable=False)

    company_name = Column(String, nullable=True)
    business_category = Column(String, nullable=True)
    gstin = Column(String, nullable=True)

    # Address information
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True, default="India")

    is_active = Column(Boolean, default=True)

    profile_photo = Column(String, nullable=True)  # URL to profile photo
    google_refresh_token = Column(String, nullable=True) # Google Calendar Refresh Token
    created_at = Column(DateTime, server_default=func.now())
    
    # Referral system
    referral_code = Column(String(8), unique=True, index=True, nullable=True)
    referred_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    referral_used = Column(Boolean, default=False)  # Has this user's referral code been used?

    # Relationships
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    referrer = relationship("User", remote_side=[id], foreign_keys=[referred_by])
