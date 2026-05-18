from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from app.db import get_db
from app.db.models.order import RentalOrder, OrderLine, OrderStatus
from app.db.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.db.models.product import Product
from app.db.models.user import User, UserRole
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])


# =====================
# Schemas
# =====================

class RentalPeriodSelection(BaseModel):
    type: str  # hour, day, week, custom
    start_date: str
    end_date: str
    quantity: int


class OrderLineCreate(BaseModel):
    product_id: str
    quantity: int = 1
    rental_period: RentalPeriodSelection
    unit_price: float
    total_price: float


class OrderCreate(BaseModel):
    quotation_id: Optional[str] = None
    vendor_id: str
    lines: List[OrderLineCreate]
    security_deposit: float = 0
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    pickup_date: Optional[str] = None
    return_date: Optional[str] = None
    late_return_fee: Optional[float] = None
    paid_amount: Optional[float] = None


class OrderLineResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    quantity: int
    rental_period_type: str
    rental_start_date: str
    rental_end_date: str
    unit_price: float
    total_price: float


class OrderResponse(BaseModel):
    id: str
    order_number: str
    quotation_id: Optional[str] = None
    customer_id: str
    customer_name: str
    vendor_id: str
    vendor_name: str
    status: str
    lines: List[OrderLineResponse]
    subtotal: float
    tax_rate: float
    tax_amount: float
    security_deposit: float
    total_amount: float
    paid_amount: float
    rental_start_date: Optional[str] = None
    rental_end_date: Optional[str] = None
    pickup_date: Optional[str] = None
    return_date: Optional[str] = None
    late_return_fee: float
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def generate_order_number():
    """Generate unique order number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"ORD-{timestamp}-{random_suffix}"


def order_to_response(order: RentalOrder) -> OrderResponse:
    customer_name = ""
    if order.customer:
        customer_name = f"{order.customer.first_name} {order.customer.last_name}"
    
    vendor_name = ""
    if order.vendor:
        vendor_name = f"{order.vendor.first_name} {order.vendor.last_name}"
    
    lines = []
    for line in order.lines:
        lines.append(OrderLineResponse(
            id=str(line.id),
            product_id=str(line.product_id) if line.product_id else "",
            product_name=line.product_name or "",
            quantity=line.quantity,
            rental_period_type=line.rental_period_type or "day",
            rental_start_date=line.rental_start_date.isoformat() if line.rental_start_date else "",
            rental_end_date=line.rental_end_date.isoformat() if line.rental_end_date else "",
            unit_price=line.unit_price or 0,
            total_price=line.total_price or 0
        ))
    
    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number or "",
        quotation_id=str(order.quotation_id) if order.quotation_id else None,
        customer_id=str(order.customer_id) if order.customer_id else "",
        customer_name=customer_name,
        vendor_id=str(order.vendor_id) if order.vendor_id else "",
        vendor_name=vendor_name,
        status=order.status.value.lower() if order.status else "pending",
        lines=lines,
        subtotal=order.subtotal or 0,
        tax_rate=order.tax_rate or 18,
        tax_amount=order.tax_amount or 0,
        security_deposit=order.security_deposit or 0,
        total_amount=order.total_amount or 0,
        paid_amount=order.paid_amount or 0,
        rental_start_date=order.rental_start_date.isoformat() if order.rental_start_date else None,
        rental_end_date=order.rental_end_date.isoformat() if order.rental_end_date else None,
        pickup_date=order.pickup_date.isoformat() if order.pickup_date else None,
        return_date=order.return_date.isoformat() if order.return_date else None,
        late_return_fee=order.late_return_fee or 0,
        created_at=order.created_at.isoformat() if order.created_at else "",
        updated_at=order.updated_at.isoformat() if order.updated_at else ""
    )


# =====================
# Endpoints
# =====================

@router.get("", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    return_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get orders - filtered by user role"""
    query = db.query(RentalOrder)
    
    # Filter based on user role
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(RentalOrder.customer_id == current_user.id)
    elif current_user.role == UserRole.VENDOR:
        query = query.filter(RentalOrder.vendor_id == current_user.id)
    # Admin sees all
    
    if status:
        try:
            order_status = OrderStatus(status.upper())
            query = query.filter(RentalOrder.status == order_status)
        except ValueError:
            pass
    
    if payment_status == 'paid':
        # Paid orders are those where paid_amount >= total_amount
        query = query.filter(RentalOrder.paid_amount >= RentalOrder.total_amount)
    elif payment_status == 'unpaid':
        query = query.filter(RentalOrder.paid_amount < RentalOrder.total_amount)
    
    if return_status == 'approaching':
        # Approaching (within 24h) or Overdue
        now = datetime.utcnow()
        tomorrow = now + timedelta(days=1)
        # return_date is set and (is in past OR is within next 24 hours)
        # AND status is not returned/completed/cancelled
        query = query.filter(
            RentalOrder.return_date != None,
            or_(
                RentalOrder.return_date <= tomorrow,
                RentalOrder.return_date < now
            ),
            RentalOrder.status.notin_([
                OrderStatus.RETURNED, 
                OrderStatus.COMPLETED, 
                OrderStatus.CANCELLED
            ])
        )

    orders = query.order_by(RentalOrder.created_at.desc()).offset(skip).limit(limit).all()
    return [order_to_response(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single order"""
    order = db.query(RentalOrder).filter(RentalOrder.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization
    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.VENDOR and order.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return order_to_response(order)


@router.post("", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    # Calculate totals
    subtotal = sum(line.total_price for line in data.lines)
    tax_rate = 18  # GST
    tax_amount = subtotal * (tax_rate / 100)
    total_amount = subtotal + tax_amount + data.security_deposit
    
    # Get rental dates from first line
    rental_start = None
    rental_end = None
    if data.lines:
        rental_start = datetime.fromisoformat(data.lines[0].rental_period.start_date.replace('Z', '+00:00'))
        rental_end = datetime.fromisoformat(data.lines[0].rental_period.end_date.replace('Z', '+00:00'))
    
    order = RentalOrder(
        order_number=generate_order_number(),
        quotation_id=uuid.UUID(data.quotation_id) if data.quotation_id else None,
        customer_id=current_user.id,
        vendor_id=uuid.UUID(data.vendor_id),
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        security_deposit=data.security_deposit,
        total_amount=total_amount,
        rental_start_date=rental_start,
        rental_end_date=rental_end,
        notes=data.notes
    )
    db.add(order)
    db.flush()
    
    # Create order lines
    for line_data in data.lines:
        product = db.query(Product).filter(Product.id == uuid.UUID(line_data.product_id)).first()
        line = OrderLine(
            order_id=order.id,
            product_id=uuid.UUID(line_data.product_id),
            product_name=product.name if product else "",
            quantity=line_data.quantity,
            rental_period_type=line_data.rental_period.type,
            rental_start_date=datetime.fromisoformat(line_data.rental_period.start_date.replace('Z', '+00:00')),
            rental_end_date=datetime.fromisoformat(line_data.rental_period.end_date.replace('Z', '+00:00')),
            unit_price=line_data.unit_price,
            total_price=line_data.total_price
        )
        db.add(line)
        
        # Update product reserved quantity
        if product:
            product.reserved_quantity = (product.reserved_quantity or 0) + line_data.quantity
    
    db.commit()
    db.refresh(order)
    
    db.commit()
    db.refresh(order)
    
    return order_to_response(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an order"""
    order = db.query(RentalOrder).filter(RentalOrder.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization
    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.VENDOR and order.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if data.status is not None:
        try:
            new_status = OrderStatus(data.status.upper())
            
            # Handle Return Logic
            if new_status == OrderStatus.RETURNED and order.status == OrderStatus.PICKED_UP:
                # 1. Set return date (default to now if not provided)
                return_date = datetime.now()
                if data.return_date:
                    return_date = datetime.fromisoformat(data.return_date.replace('Z', '+00:00'))
                order.return_date = return_date
                
                # 2. Calculate Late Fees
                late_fee = 0.0
                if order.rental_end_date:
                    # Ensure timezone awareness compatibility
                    if return_date.tzinfo is None and order.rental_end_date.tzinfo is not None:
                         return_date = return_date.replace(tzinfo=order.rental_end_date.tzinfo)
                    elif return_date.tzinfo is not None and order.rental_end_date.tzinfo is None:
                         return_date = return_date.replace(tzinfo=None)
                         
                    if return_date > order.rental_end_date:
                        # Simple rule: 10% of total per day late
                        days_late = (return_date - order.rental_end_date).days + 1
                        late_fee = float(order.total_amount) * 0.10 * days_late
                
                # If user provided fee, override
                if data.late_return_fee is not None:
                     late_fee = data.late_return_fee
                
                order.late_return_fee = late_fee
                
                # Update total amount (Deposit is already in total? No, total = subtotal + tax + deposit usually? 
                # Model says: total_amount = subtotal + tax_amount. Deposit is separate field.
                # create_order: total_amount = subtotal + tax_amount + data.security_deposit
                # So Total Amount INCLUDES deposit.
                
                # 3. Refund Security Deposit
                # Refund = Deposit - Late Fee
                refund_amount = (order.security_deposit or 0) - late_fee
                
                if refund_amount > 0:
                    try:
                        from app.services.wallet_service import wallet_service
                        wallet_service.credit_wallet(
                            db, 
                            order.customer_id, 
                            refund_amount, 
                            f"Refund Security Deposit (Order #{order.order_number})",
                            "ORDER_REFUND",
                            str(order.id)
                        )
                    except Exception as e:
                        print(f"Failed to refund wallet: {e}")
                        # Don't block return, but maybe log it?
                
                # 4. Update Status to COMPLETED (to release inventory)
                # The user asked for "return logic", usually implies "Returned" state then "Completed".
                # But our update_order logic releases inventory on COMPLETED.
                # So let's auto-transition to COMPLETED.
                order.status = OrderStatus.COMPLETED
                
                # Release inventory
                for line in order.lines:
                    if line.product:
                        line.product.reserved_quantity = max(0, (line.product.reserved_quantity or 0) - line.quantity)
                        
            else:
                 prev_status = order.status
                 order.status = new_status
                 
                 # Send email for PICKED_UP
                 if new_status == OrderStatus.PICKED_UP and prev_status != OrderStatus.PICKED_UP and order.customer:
                    try:
                        from app.services.email_service import send_email
                        
                        return_date_str = "Not specified"
                        if order.rental_end_date:
                            return_date_str = order.rental_end_date.strftime("%B %d, %Y")
                        
                        subject = f"Order Picked Up - {order.order_number}"
                        html_content = f"""
                        <html>
                            <body>
                                <div style="font-family: Arial, sans-serif; padding: 20px;">
                                    <h2 style="color: #4F46E5;">Order Picked Up</h2>
                                    <p>Hi {order.customer.first_name},</p>
                                    <p>Your rental order <strong>{order.order_number}</strong> has been marked as picked up.</p>
                                    
                                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0;"><strong>⚠️ Return Reminder</strong></p>
                                        <p style="margin: 5px 0 0;">Please ensure the items are returned by <strong>{return_date_str}</strong> to avoid late fees.</p>
                                    </div>
                                    
                                    <p>Happy Renting!</p>
                                </div>
                            </body>
                        </html>
                        """
                        send_email(order.customer.email, subject, html_content)
                    except Exception as e:
                         print(f"Failed to send pickup email: {e}")

                 # If completed or cancelled manually
                 if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
                    for line in order.lines:
                        if line.product:
                            line.product.reserved_quantity = max(0, (line.product.reserved_quantity or 0) - line.quantity)

        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    if data.pickup_date is not None:
        order.pickup_date = datetime.fromisoformat(data.pickup_date.replace('Z', '+00:00'))
    
    # We handled return_date and late_return_fee in the status block if status=RETURNED
    # But allow updating them separately if needed (e.g. correcting a mistake)
    if data.return_date is not None and order.status != OrderStatus.COMPLETED: 
         order.return_date = datetime.fromisoformat(data.return_date.replace('Z', '+00:00'))

    if data.late_return_fee is not None and order.status != OrderStatus.COMPLETED:
        order.late_return_fee = data.late_return_fee

    if data.paid_amount is not None:
        order.paid_amount = data.paid_amount
    
    db.commit()
    db.refresh(order)
    
    return order_to_response(order)


@router.delete("/{order_id}")
async def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an order"""
    order = db.query(RentalOrder).filter(RentalOrder.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel order in current status")
    
    order.status = OrderStatus.CANCELLED
    
    # Release reserved quantities
    for line in order.lines:
        if line.product:
            line.product.reserved_quantity = max(0, (line.product.reserved_quantity or 0) - line.quantity)
    
    db.commit()
    
    return {"message": "Order cancelled successfully"}
