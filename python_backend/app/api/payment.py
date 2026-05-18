from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.api.auth import get_current_user
from app.db.models.user import User
from app.db.models.invoice import Invoice
from app.db.models.order import RentalOrder
from app.db.models.coupon import Coupon, DiscountType
from app.core.config import settings
from datetime import datetime
from typing import Optional
import razorpay
from pydantic import BaseModel

router = APIRouter()

def get_razorpay_client():
    """Get Razorpay client with current credentials"""
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay credentials not configured"
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


# =====================
# Coupon Validation
# =====================

class CouponValidateRequest(BaseModel):
    code: str
    order_amount: float


class CouponValidateResponse(BaseModel):
    valid: bool
    message: str
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None


@router.post("/validate-coupon", response_model=CouponValidateResponse)
async def validate_coupon(
    request: CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate a coupon code and calculate discount"""
    code = request.code.upper().strip()
    order_amount = request.order_amount
    
    # Find coupon
    coupon = db.query(Coupon).filter(Coupon.code == code).first()
    
    if not coupon:
        return CouponValidateResponse(
            valid=False,
            message="Invalid coupon code"
        )
    
    # Check if active
    if not coupon.is_active:
        return CouponValidateResponse(
            valid=False,
            message="This coupon is no longer active"
        )
    
    # Check validity period
    now = datetime.utcnow()
    if coupon.valid_from and now < coupon.valid_from.replace(tzinfo=None):
        return CouponValidateResponse(
            valid=False,
            message="This coupon is not yet valid"
        )
    
    if coupon.valid_until and now > coupon.valid_until.replace(tzinfo=None):
        return CouponValidateResponse(
            valid=False,
            message="This coupon has expired"
        )
    
    # Check usage limit
    if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
        return CouponValidateResponse(
            valid=False,
            message="This coupon has reached its usage limit"
        )
    
    # Check minimum order amount
    min_amount = float(coupon.min_order_amount) if coupon.min_order_amount else 0
    if order_amount < min_amount:
        return CouponValidateResponse(
            valid=False,
            message=f"Minimum order amount of ₹{min_amount:.0f} required",
            min_order_amount=min_amount
        )
    
    # Calculate discount
    discount_value = float(coupon.discount_value)
    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount_amount = order_amount * (discount_value / 100)
        # Apply max discount cap if set
        if coupon.max_discount_amount:
            max_discount = float(coupon.max_discount_amount)
            discount_amount = min(discount_amount, max_discount)
    else:
        # Fixed discount
        discount_amount = min(discount_value, order_amount)
    
    final_amount = order_amount - discount_amount
    
    return CouponValidateResponse(
        valid=True,
        message=f"Coupon applied! You save ₹{discount_amount:.0f}",
        code=coupon.code,
        discount_type=coupon.discount_type.value,
        discount_value=discount_value,
        discount_amount=discount_amount,
        final_amount=final_amount,
        min_order_amount=min_amount if min_amount > 0 else None,
        max_discount_amount=float(coupon.max_discount_amount) if coupon.max_discount_amount else None
    )


# =====================
# Razorpay Payment
# =====================

class PaymentCreate(BaseModel):
    amount: int  # Amount in paise (e.g., 50000 for ₹500.00)
    currency: str = "INR"
    receipt: str

@router.post("/create-order")
async def create_razorpay_order(
    item: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Items: {item}")
    try:
        # Debug Credentials (Masked)
        key_id = settings.RAZORPAY_KEY_ID
        key_secret = settings.RAZORPAY_KEY_SECRET
        print(f"DEBUG: Razorpay Key ID present: {bool(key_id)}")
        print(f"DEBUG: Razorpay Secret present: {bool(key_secret)}")
        if key_id:
            print(f"DEBUG: Razorpay Key ID starts with: {key_id[:8]}...")

        razorpay_client = get_razorpay_client()

        data = {
            "amount": item.amount,
            "currency": item.currency,
            "receipt": item.receipt,
            "notes": {
                "user_id": str(current_user.id),
                "email": current_user.email
            }
        }
        print(f"DEBUG: Creating Razorpay order with data: {data}")
        
        # Create Razorpay Order
        order = razorpay_client.order.create(data=data)
        print(f"DEBUG: Razorpay Order Created: {order}")
        
        return {
            "id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "receipt": order["receipt"],
            "key_id": settings.RAZORPAY_KEY_ID
        }
    except razorpay.errors.BadRequestError as e:
        print(f"ERROR: Razorpay BadRequest: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment request: {str(e)}"
        )
    except razorpay.errors.ServerError as e:
        print(f"ERROR: Razorpay ServerError: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Razorpay server error. Please try again."
        )
    except Exception as e:
        print(f"ERROR: General Payment Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment Error: {str(e)}"
        )
