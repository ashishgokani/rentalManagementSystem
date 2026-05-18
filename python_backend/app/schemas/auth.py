from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    VENDOR = "VENDOR"
    CUSTOMER = "CUSTOMER"

class SignupRole(str, Enum):
    """Roles allowed for signup (no admin)"""
    VENDOR = "VENDOR"
    CUSTOMER = "CUSTOMER"

# Request Schemas
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    password: str

    company_name: Optional[str] = None
    business_category: Optional[str] = None
    gstin: Optional[str] = None
    role: SignupRole = SignupRole.CUSTOMER
    referral_code: Optional[str] = None  # Referral code from another user
    
    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        if isinstance(v, str):
            v = v.upper()
        if v == 'ADMIN':
            raise ValueError('Admin accounts cannot be created through signup')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class PasswordReset(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class TokenRefresh(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

    company_name: Optional[str] = None
    business_category: Optional[str] = None
    gstin: Optional[str] = None
    
    # Address fields
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

# Response Schemas
class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None

    role: UserRole
    company_name: Optional[str] = None
    business_category: Optional[str] = None
    gstin: Optional[str] = None
    # Address info
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    
    is_active: bool = True
    referral_code: Optional[str] = None  # User's own referral code
    profile_photo: Optional[str] = None  # URL to profile photo
    is_calendar_connected: bool = False

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class ReferralCodeValidation(BaseModel):
    valid: bool
    message: str

class OTPResponse(BaseModel):
    message: str
    expires_in_minutes: int
