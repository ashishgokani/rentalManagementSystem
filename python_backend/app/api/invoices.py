from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from app.db import get_db
from app.db.models.invoice import Invoice, InvoiceLine, InvoiceStatus, Payment, PaymentMethod, PaymentStatus
from app.db.models.order import RentalOrder, OrderStatus
from app.db.models.user import User, UserRole
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# =====================
# Schemas
# =====================

class InvoiceLineCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    total_price: float


class InvoiceCreate(BaseModel):
    order_id: str
    lines: List[InvoiceLineCreate]
    due_days: int = 30
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: float
    method: str  # ONLINE, CARD, BANK_TRANSFER, CASH
    transaction_id: Optional[str] = None


class InvoiceLineResponse(BaseModel):
    id: str
    description: str
    quantity: int
    unit_price: float
    total_price: float


class PaymentResponse(BaseModel):
    id: str
    amount: float
    method: str
    status: str
    transaction_id: Optional[str] = None
    created_at: str


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    order_id: str
    customer_id: str
    customer_name: str
    customer_gstin: Optional[str] = None
    status: str
    lines: List[InvoiceLineResponse]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total_amount: float
    paid_amount: float
    due_date: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def generate_invoice_number():
    """Generate unique invoice number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"INV-{timestamp}-{random_suffix}"


def invoice_to_response(invoice: Invoice) -> InvoiceResponse:
    customer_name = ""
    customer_gstin = None
    if invoice.customer:
        customer_name = f"{invoice.customer.first_name} {invoice.customer.last_name}"
        customer_gstin = invoice.customer.gstin

    lines = []
    for line in invoice.lines:
        lines.append(InvoiceLineResponse(
            id=str(line.id),
            description=line.description or "",
            quantity=line.quantity,
            unit_price=line.unit_price or 0,
            total_price=line.total_price or 0
        ))

    return InvoiceResponse(
        id=str(invoice.id),
        invoice_number=invoice.invoice_number or "",
        order_id=str(invoice.order_id) if invoice.order_id else "",
        customer_id=str(invoice.customer_id) if invoice.customer_id else "",
        customer_name=customer_name,
        customer_gstin=customer_gstin,
        status=invoice.status.value if invoice.status else "DRAFT",
        lines=lines,
        subtotal=invoice.subtotal or 0,
        tax_rate=invoice.tax_rate or 18,
        tax_amount=invoice.tax_amount or 0,
        total_amount=invoice.total_amount or 0,
        paid_amount=invoice.paid_amount or 0,
        due_date=invoice.due_date.isoformat() if invoice.due_date else None,
        created_at=invoice.created_at.isoformat() if invoice.created_at else "",
        updated_at=invoice.updated_at.isoformat() if invoice.updated_at else ""
    )


# =====================
# Endpoints
# =====================

@router.get("", response_model=List[InvoiceResponse])
async def get_invoices(
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Get invoices"""
    query = db.query(Invoice)

    # Filter based on user role
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Invoice.customer_id == current_user.id)
    # Admin sees all

    if status:
        try:
            inv_status = InvoiceStatus(status.upper())
            query = query.filter(Invoice.status == inv_status)
        except ValueError:
            pass

    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return [invoice_to_response(i) for i in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
        invoice_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Get a single invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == uuid.UUID(invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return invoice_to_response(invoice)


@router.get("/order/{order_id}", response_model=Optional[InvoiceResponse])
async def get_invoice_by_order(
        order_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Get invoice for a specific order"""
    invoice = db.query(Invoice).filter(Invoice.order_id == uuid.UUID(order_id)).first()
    if not invoice:
        return None

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return invoice_to_response(invoice)


@router.post("", response_model=InvoiceResponse)
async def create_invoice(
        data: InvoiceCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Create a new invoice (usually from an order)"""
    # Get the order
    order = db.query(RentalOrder).filter(RentalOrder.id == uuid.UUID(data.order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if invoice already exists for this order
    existing = db.query(Invoice).filter(Invoice.order_id == order.id).first()
    if existing:
        return invoice_to_response(existing)

    # Calculate totals
    subtotal = sum(line.total_price for line in data.lines)
    tax_rate = 18
    tax_amount = subtotal * (tax_rate / 100)
    total_amount = subtotal + tax_amount

    invoice = Invoice(
        invoice_number=generate_invoice_number(),
        order_id=order.id,
        customer_id=order.customer_id,
        status=InvoiceStatus.DRAFT,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        due_date=datetime.now() + timedelta(days=data.due_days),
        notes=data.notes
    )
    db.add(invoice)
    db.flush()

    # Create invoice lines
    for line_data in data.lines:
        line = InvoiceLine(
            invoice_id=invoice.id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            total_price=line_data.total_price
        )
        db.add(line)

    db.commit()
    db.refresh(invoice)

    return invoice_to_response(invoice)


@router.post("/{invoice_id}/payments", response_model=PaymentResponse)
async def add_payment(
        invoice_id: str,
        data: PaymentCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Add a payment to an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == uuid.UUID(invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        payment_method = PaymentMethod(data.method.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payment method")

    # Handle Wallet Payment
    if payment_method == PaymentMethod.WALLET:
        from app.db.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus

        # Get user's wallet
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if not wallet:
            # Create if not exists (though typically should exist)
            wallet = Wallet(user_id=current_user.id, balance=0.0)
            db.add(wallet)
            db.flush()

        if not wallet.is_active:
            raise HTTPException(status_code=400, detail="Wallet is inactive")

        if wallet.balance < data.amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")

        # Deduct from wallet
        balance_before = wallet.balance
        wallet.balance -= data.amount

        # Record transaction
        wallet_txn = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEBIT,
            amount=data.amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            status=TransactionStatus.COMPLETED,
            reference_type="INVOICE_PAYMENT",
            reference_id=invoice.id,
            description=f"Payment for Invoice #{invoice.invoice_number}"
        )
        db.add(wallet_txn)
        # Use wallet txn ID as payment transaction ID
        data.transaction_id = str(wallet_txn.id)

    payment = Payment(
        invoice_id=invoice.id,
        amount=data.amount,
        method=payment_method,
        status=PaymentStatus.COMPLETED,
        transaction_id=data.transaction_id
    )
    db.add(payment)

    # Update invoice
    invoice.paid_amount = (invoice.paid_amount or 0) + data.amount

    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID

        # Send Payment Receipt Email
        if invoice.customer:
            try:
                from app.services.email_service import send_email
                from app.db.models.quotation import Quotation, QuotationStatus

                # Build Line Items Table
                lines_html = """
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                            <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                """

                for line in invoice.lines:
                    lines_html += f"""
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">{line.description}</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">{line.quantity}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹{line.total_price}</td>
                    </tr>
                    """

                lines_html += f"""
                    </tbody>
                    <tfoot>
                         <tr>
                            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total Paid:</td>
                            <td style="padding: 10px; text-align: right; font-weight: bold;">₹{data.amount}</td>
                        </tr>
                    </tfoot>
                </table>
                """

                fromDate = "N/A"
                toDate = "N/A"
                vendorName = "RentPe Vendor"

                if invoice.order_id:
                    order = db.query(RentalOrder).filter(RentalOrder.id == invoice.order_id).first()
                    if order:
                        fromDate = order.rental_start_date.strftime("%b %d, %Y") if order.rental_start_date else "N/A"
                        toDate = order.rental_end_date.strftime("%b %d, %Y") if order.rental_end_date else "N/A"
                        if order.vendor:
                            vendorName = f"{order.vendor.first_name} {order.vendor.last_name}"

                subject = f"Invoice & Payment Receipt - {invoice.invoice_number}"
                html_content = f"""
                <html>
                    <body>
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <h2 style="color: #059669; margin: 0;">Payment Successful</h2>
                                <p style="color: #6b7280; margin-top: 5px;">Your order has been confirmed</p>
                            </div>

                            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: green; font-weight: bold;">PAID</span></p>
                                <p style="margin: 5px 0;"><strong>Vendor:</strong> {vendorName}</p>
                                <p style="margin: 5px 0;"><strong>Rental Period:</strong> {fromDate} - {toDate}</p>
                            </div>

                            <h3 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Order Details</h3>
                            {lines_html}

                            <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280;">
                                <p>You can view detailed invoice and print it from your dashboard.</p>
                                <p>&copy; 2024 RentPe. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                </html>
                """
                try:
                    print(f"Attempting to send payment confirmation email to {invoice.customer.email}")
                    send_email(
                        to_email=invoice.customer.email,
                        subject=f"Payment Confirmation - {invoice.invoice_number}",
                        html_content=html_content
                    )
                    print(f"Successfully sent payment confirmation email to {invoice.customer.email}")
                except Exception as e:
                    print(f"FAILED to send payment confirmation email: {e}")
                    # Do not re-raise, allow transaction to complete

                if invoice.order_id:
                     # Access order via relationship or query
                     order_q = db.query(RentalOrder).filter(RentalOrder.id == invoice.order_id).first()
                     if order_q and order_q.quotation_id:
                         quotation = db.query(Quotation).filter(Quotation.id == order_q.quotation_id).first()
                         if quotation:
                            print(f"Nullifying quotation ref for ALL orders referencing quotation {quotation.id}")
                            # Nullify explicit reference in the current object
                            order_q.quotation_id = None
                            db.add(order_q)
                            
                            # Also bulk update any other orders that might reference this quotation (handling edge cases)
                            db.query(RentalOrder).filter(RentalOrder.quotation_id == quotation.id).update({RentalOrder.quotation_id: None})
                            
                            db.flush() # Force update so FK reference is gone
                            
                            print(f"Deleting linked quotation {quotation.id}")
                            db.delete(quotation)

            except Exception as e:
                print(f"Failed to process post-payment actions: {e}")
                import traceback
                traceback.print_exc()

    elif invoice.paid_amount > 0:
        invoice.status = InvoiceStatus.PARTIAL

    db.commit()

    # Update linked order
    if invoice.order_id:
        order = db.query(RentalOrder).filter(RentalOrder.id == invoice.order_id).first()
        if order:
            order.paid_amount = (order.paid_amount or 0) + data.amount

            # If invoice is paid, confirm the order if it was pending
            if invoice.status == InvoiceStatus.PAID and order.status == OrderStatus.PENDING:
                order.status = OrderStatus.CONFIRMED

            db.add(order)
            db.commit()
            db.refresh(order)

    db.refresh(payment)

    return PaymentResponse(
        id=str(payment.id),
        amount=payment.amount,
        method=payment.method.value,
        status=payment.status.value,
        transaction_id=payment.transaction_id,
        created_at=payment.created_at.isoformat() if payment.created_at else ""
    )


@router.get("/{invoice_id}/payments", response_model=List[PaymentResponse])
async def get_invoice_payments(
        invoice_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Get all payments for an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == uuid.UUID(invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return [
        PaymentResponse(
            id=str(p.id),
            amount=p.amount,
            method=p.method.value,
            status=p.status.value,
            transaction_id=p.transaction_id,
            created_at=p.created_at.isoformat() if p.created_at else ""
        )
        for p in invoice.payments
    ]