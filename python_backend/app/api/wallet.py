from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.db import get_db
from app.db.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus
from app.db.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])


# =====================
# Schemas
# =====================

class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    currency: str
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: str
    wallet_id: str
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    status: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    external_reference: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AddFundsRequest(BaseModel):
    amount: float
    payment_method: str  # 'UPI', 'CARD', 'BANK_TRANSFER'
    external_reference: Optional[str] = None


class WithdrawFundsRequest(BaseModel):
    amount: float
    description: Optional[str] = None


class WalletSummaryResponse(BaseModel):
    wallet: WalletResponse
    recent_transactions: List[TransactionResponse]
    total_credited: float
    total_debited: float


# =====================
# Helper Functions
# =====================

def get_or_create_wallet(db: Session, user_id: uuid.UUID) -> Wallet:
    """Get user's wallet or create one if it doesn't exist"""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def wallet_to_response(wallet: Wallet) -> WalletResponse:
    return WalletResponse(
        id=str(wallet.id),
        user_id=str(wallet.user_id),
        balance=wallet.balance,
        currency=wallet.currency,
        is_active=wallet.is_active,
        created_at=wallet.created_at.isoformat() if wallet.created_at else "",
        updated_at=wallet.updated_at.isoformat() if wallet.updated_at else ""
    )


def transaction_to_response(txn: WalletTransaction) -> TransactionResponse:
    return TransactionResponse(
        id=str(txn.id),
        wallet_id=str(txn.wallet_id),
        transaction_type=txn.transaction_type.value,
        amount=txn.amount,
        balance_before=txn.balance_before,
        balance_after=txn.balance_after,
        status=txn.status.value,
        reference_type=txn.reference_type,
        reference_id=str(txn.reference_id) if txn.reference_id else None,
        description=txn.description,
        payment_method=txn.payment_method,
        external_reference=txn.external_reference,
        created_at=txn.created_at.isoformat() if txn.created_at else ""
    )


# =====================
# Endpoints
# =====================

@router.get("", response_model=WalletResponse)
async def get_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's wallet"""
    wallet = get_or_create_wallet(db, current_user.id)
    return wallet_to_response(wallet)


@router.get("/summary", response_model=WalletSummaryResponse)
async def get_wallet_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get wallet summary with recent transactions"""
    wallet = get_or_create_wallet(db, current_user.id)
    
    # Get recent transactions (last 10)
    recent_transactions = db.query(WalletTransaction).filter(
        WalletTransaction.wallet_id == wallet.id
    ).order_by(WalletTransaction.created_at.desc()).limit(10).all()
    
    # Calculate totals
    total_credited = db.query(WalletTransaction).filter(
        WalletTransaction.wallet_id == wallet.id,
        WalletTransaction.transaction_type == TransactionType.CREDIT,
        WalletTransaction.status == TransactionStatus.COMPLETED
    ).with_entities(func.coalesce(func.sum(WalletTransaction.amount), 0)).scalar() or 0
    
    total_debited = db.query(WalletTransaction).filter(
        WalletTransaction.wallet_id == wallet.id,
        WalletTransaction.transaction_type == TransactionType.DEBIT,
        WalletTransaction.status == TransactionStatus.COMPLETED
    ).with_entities(func.coalesce(func.sum(WalletTransaction.amount), 0)).scalar() or 0
    
    return WalletSummaryResponse(
        wallet=wallet_to_response(wallet),
        recent_transactions=[transaction_to_response(t) for t in recent_transactions],
        total_credited=total_credited,
        total_debited=total_debited
    )


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = 0,
    limit: int = 20,
    transaction_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get wallet transactions with optional filtering"""
    wallet = get_or_create_wallet(db, current_user.id)
    
    query = db.query(WalletTransaction).filter(WalletTransaction.wallet_id == wallet.id)
    
    if transaction_type:
        try:
            txn_type = TransactionType(transaction_type)
            query = query.filter(WalletTransaction.transaction_type == txn_type)
        except ValueError:
            pass
    
    transactions = query.order_by(WalletTransaction.created_at.desc()).offset(skip).limit(limit).all()
    return [transaction_to_response(t) for t in transactions]


@router.post("/add-funds", response_model=TransactionResponse)
async def add_funds(
    data: AddFundsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add funds to wallet"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    wallet = get_or_create_wallet(db, current_user.id)
    
    if not wallet.is_active:
        raise HTTPException(status_code=400, detail="Wallet is inactive")
    
    balance_before = wallet.balance
    wallet.balance += data.amount
    
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=TransactionType.CREDIT,
        amount=data.amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        status=TransactionStatus.COMPLETED,
        reference_type="TOPUP",
        description=f"Added funds via {data.payment_method}",
        payment_method=data.payment_method,
        external_reference=data.external_reference
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction_to_response(transaction)


@router.post("/withdraw", response_model=TransactionResponse)
async def withdraw_funds(
    data: WithdrawFundsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Withdraw funds from wallet (for vendors)"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    wallet = get_or_create_wallet(db, current_user.id)
    
    if not wallet.is_active:
        raise HTTPException(status_code=400, detail="Wallet is inactive")
    
    if wallet.balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    balance_before = wallet.balance
    wallet.balance -= data.amount
    
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=TransactionType.DEBIT,
        amount=data.amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        status=TransactionStatus.COMPLETED,
        reference_type="WITHDRAWAL",
        description=data.description or "Withdrawal request"
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction_to_response(transaction)


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific transaction"""
    wallet = get_or_create_wallet(db, current_user.id)
    
    transaction = db.query(WalletTransaction).filter(
        WalletTransaction.id == uuid.UUID(transaction_id),
        WalletTransaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction_to_response(transaction)
