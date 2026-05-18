from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from app.db import get_db
from app.db.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.db.models.product import Product
from app.db.models.user import User, UserRole
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/quotations", tags=["Quotations"])


# =====================
# Schemas
# =====================

class RentalPeriodSelection(BaseModel):
    type: str
    start_date: str
    end_date: str
    quantity: int


class QuotationLineCreate(BaseModel):
    product_id: str
    quantity: int = 1
    rental_period: RentalPeriodSelection
    unit_price: float
    total_price: float


class QuotationCreate(BaseModel):
    lines: List[QuotationLineCreate]
    valid_days: int = 7
    notes: Optional[str] = None


class QuotationLineUpdate(BaseModel):
    id: str
    unit_price: float
    total_price: float


class QuotationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    lines: Optional[List[QuotationLineUpdate]] = None


class QuotationLineResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    quantity: int
    rental_period_type: str
    rental_start_date: str
    rental_end_date: str
    unit_price: float
    total_price: float


class QuotationResponse(BaseModel):
    id: str
    quotation_number: str
    customer_id: str
    customer_name: str
    status: str
    lines: List[QuotationLineResponse]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total_amount: float
    valid_until: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def generate_quotation_number():
    """Generate unique quotation number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"QUO-{timestamp}-{random_suffix}"


def quotation_to_response(quotation: Quotation) -> QuotationResponse:
    customer_name = ""
    if quotation.customer:
        customer_name = f"{quotation.customer.first_name} {quotation.customer.last_name}"
    
    lines = []
    for line in quotation.lines:
        lines.append(QuotationLineResponse(
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
    
    return QuotationResponse(
        id=str(quotation.id),
        quotation_number=quotation.quotation_number or "",
        customer_id=str(quotation.customer_id) if quotation.customer_id else "",
        customer_name=customer_name,
        status=quotation.status.value if quotation.status else "DRAFT",
        lines=lines,
        subtotal=quotation.subtotal or 0,
        tax_rate=quotation.tax_rate or 18,
        tax_amount=quotation.tax_amount or 0,
        total_amount=quotation.total_amount or 0,
        valid_until=quotation.valid_until.isoformat() if quotation.valid_until else None,
        created_at=quotation.created_at.isoformat() if quotation.created_at else "",
        updated_at=quotation.updated_at.isoformat() if quotation.updated_at else ""
    )


# =====================
# Endpoints
# =====================

@router.get("", response_model=List[QuotationResponse])
async def get_quotations(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quotations - filtered by user"""
    query = db.query(Quotation)
    
    # Filter based on user role
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Quotation.customer_id == current_user.id)
    elif current_user.role == UserRole.VENDOR:
        query = query.filter(Quotation.vendor_id == current_user.id)
    # Admin sees all
    
    if status:
        try:
            quo_status = QuotationStatus(status.upper())
            query = query.filter(Quotation.status == quo_status)
        except ValueError:
            pass
    
    quotations = query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit).all()
    return [quotation_to_response(q) for q in quotations]


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == uuid.UUID(quotation_id)).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.VENDOR and quotation.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return quotation_to_response(quotation)


@router.post("", response_model=List[QuotationResponse])
async def create_quotation(
    data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new quotation(s) - splits by vendor"""
    # 1. Group items by vendor
    items_by_vendor = {}
    
    for line_data in data.lines:
        product = db.query(Product).filter(Product.id == uuid.UUID(line_data.product_id)).first()
        if not product:
            continue
            
        vendor_id = str(product.vendor_id)
        if vendor_id not in items_by_vendor:
            items_by_vendor[vendor_id] = []
        
        # Attach product info to line data for later use
        items_by_vendor[vendor_id].append({
            "line_data": line_data,
            "product": product
        })
    
    created_quotations = []
    
    # 2. Create one quotation per vendor
    for vendor_id, items in items_by_vendor.items():
        # Calculate totals for this vendor's items
        subtotal = sum(item["line_data"].total_price for item in items)
        tax_rate = 18
        tax_amount = subtotal * (tax_rate / 100)
        total_amount = subtotal + tax_amount
        
        quotation = Quotation(
            quotation_number=generate_quotation_number(),
            customer_id=current_user.id,
            vendor_id=uuid.UUID(vendor_id),
            status=QuotationStatus.DRAFT,
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total_amount=total_amount,
            valid_until=datetime.now() + timedelta(days=data.valid_days),
            notes=data.notes
        )
        db.add(quotation)
        db.flush()
        
        # Create lines
        for item in items:
            line_data = item["line_data"]
            product = item["product"]
            
            line = QuotationLine(
                quotation_id=quotation.id,
                product_id=product.id,
                product_name=product.name,
                quantity=line_data.quantity,
                rental_period_type=line_data.rental_period.type,
                rental_start_date=datetime.fromisoformat(line_data.rental_period.start_date.replace('Z', '+00:00')),
                rental_end_date=datetime.fromisoformat(line_data.rental_period.end_date.replace('Z', '+00:00')),
                unit_price=line_data.unit_price,
                total_price=line_data.total_price
            )
            db.add(line)
        
        created_quotations.append(quotation)

    db.commit()
    for q in created_quotations:
        db.refresh(q)
    
    return [quotation_to_response(q) for q in created_quotations]


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: str,
    data: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quotation status"""
    quotation = db.query(Quotation).filter(Quotation.id == uuid.UUID(quotation_id)).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if data.status is not None:
        try:
            new_status = QuotationStatus(data.status.upper())
            quotation.status = new_status
            
            # Send email to customer if status is SENT
            if new_status == QuotationStatus.SENT and quotation.customer:
                try:
                    from app.services.email_service import send_email
                    
                    subject = f"New Quotation Received - {quotation.quotation_number}"
                    html_content = f"""
                    <html>
                        <body>
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>You have received a new quotation!</h2>
                                <p>Hi {quotation.customer.first_name},</p>
                                <p>Vendor has submitted a quotation for your request.</p>
                                <p><strong>Quotation Number:</strong> {quotation.quotation_number}</p>
                                <p><strong>Amount:</strong> ₹{quotation.total_amount}</p>
                                <p>Please login to your dashboard to review and accept/reject this quotation.</p>
                            </div>
                        </body>
                    </html>
                    """
                    send_email(quotation.customer.email, subject, html_content)
                except Exception as e:
                    print(f"Failed to send quotation email: {e}")

        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    if data.notes is not None:
        quotation.notes = data.notes
        
    # Handle Line Updates (Price changes by Vendor/Admin)
    if data.lines and (current_user.role == UserRole.VENDOR or current_user.role == UserRole.ADMIN):
        for line_update in data.lines:
             line = next((l for l in quotation.lines if str(l.id) == line_update.id), None)
             if line:
                 line.unit_price = line_update.unit_price
                 line.total_price = line_update.total_price
        
        # Recalculate Totals
        subtotal = sum(line.total_price for line in quotation.lines)
        quotation.subtotal = subtotal
        quotation.tax_amount = subtotal * (quotation.tax_rate / 100)
        quotation.total_amount = subtotal + quotation.tax_amount
    
    db.commit()
    db.refresh(quotation)
    
    return quotation_to_response(quotation)


@router.delete("/{quotation_id}")
async def delete_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete/cancel a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == uuid.UUID(quotation_id)).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if quotation.status == QuotationStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Cannot delete confirmed quotation")
    
    quotation.status = QuotationStatus.CANCELLED
    db.commit()
    
    return {"message": "Quotation cancelled successfully"}
