from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from enum import Enum

from app.db import get_db
from app.db.models.user import User, UserRole
from app.services.auth_service import get_password_hash, get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


# Dependency to check if user is admin
async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# =====================
# Schemas
# =====================

class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: UserRole


class VendorApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None


class AdminUserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: UserRole
    company_name: Optional[str] = None
    business_category: Optional[str] = None
    gstin: Optional[str] = None


class UserListResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    company_name: Optional[str]
    business_category: Optional[str]
    gstin: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_users: int
    total_vendors: int
    total_customers: int
    active_users: int
    new_users_this_month: int
    new_vendors_this_month: int


class PaginatedResponse(BaseModel):
    items: List[UserListResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# =====================
# Dashboard Endpoints
# =====================

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get admin dashboard statistics"""
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_users = db.query(func.count(User.id)).scalar()
    total_vendors = db.query(func.count(User.id)).filter(User.role == UserRole.VENDOR).scalar()
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    
    new_users_this_month = db.query(func.count(User.id)).filter(
        User.created_at >= start_of_month
    ).scalar()
    
    new_vendors_this_month = db.query(func.count(User.id)).filter(
        User.role == UserRole.VENDOR,
        User.created_at >= start_of_month
    ).scalar()
    
    return DashboardStats(
        total_users=total_users or 0,
        total_vendors=total_vendors or 0,
        total_customers=total_customers or 0,
        active_users=active_users or 0,
        new_users_this_month=new_users_this_month or 0,
        new_vendors_this_month=new_vendors_this_month or 0
    )


# =====================
# User Management Endpoints
# =====================

@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all users with pagination and filters"""
    query = db.query(User)
    
    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.company_name.ilike(search_filter))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.order_by(desc(User.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    
    total_pages = (total + per_page - 1) // per_page
    
    return PaginatedResponse(
        items=[UserListResponse(
            id=str(user.id),
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            role=user.role.value,
            company_name=user.company_name,
            business_category=user.business_category,
            gstin=user.gstin,
            is_active=user.is_active,
            created_at=user.created_at
        ) for user in users],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/users/{user_id}", response_model=UserListResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserListResponse(
        id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        company_name=user.company_name,
        business_category=user.business_category,
        gstin=user.gstin,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.post("/users", response_model=UserListResponse)
async def create_user(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new user (admin only - can create any role including admin)"""
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        company_name=user_data.company_name,
        business_category=user_data.business_category,
        gstin=user_data.gstin,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        company_name=user.company_name,
        business_category=user.business_category,
        gstin=user.gstin,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.patch("/users/{user_id}/status", response_model=UserListResponse)
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Activate or deactivate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deactivating yourself
    if str(user.id) == str(admin.id) and not status_update.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user.is_active = status_update.is_active
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        company_name=user.company_name,
        business_category=user.business_category,
        gstin=user.gstin,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.patch("/users/{user_id}/role", response_model=UserListResponse)
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Change a user's role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent changing your own role
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        company_name=user.company_name,
        business_category=user.business_category,
        gstin=user.gstin,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


# =====================
# Vendor Management Endpoints
# =====================

@router.get("/vendors", response_model=PaginatedResponse)
async def list_vendors(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all vendors with pagination"""
    query = db.query(User).filter(User.role == UserRole.VENDOR)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.company_name.ilike(search_filter))
        )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    vendors = query.order_by(desc(User.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    total_pages = (total + per_page - 1) // per_page
    
    return PaginatedResponse(
        items=[UserListResponse(
            id=str(v.id),
            first_name=v.first_name,
            last_name=v.last_name,
            email=v.email,
            role=v.role.value,
            company_name=v.company_name,
            business_category=v.business_category,
            gstin=v.gstin,
            is_active=v.is_active,
            created_at=v.created_at
        ) for v in vendors],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.post("/vendors/{vendor_id}/approve")
async def approve_vendor(
    vendor_id: str,
    approval: VendorApproval,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Approve or reject a vendor"""
    vendor = db.query(User).filter(User.id == vendor_id, User.role == UserRole.VENDOR).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.is_active = approval.approved
    db.commit()
    
    action = "approved" if approval.approved else "rejected"
    return {"message": f"Vendor {action} successfully"}


# =====================
# Wallet Management Endpoints
# =====================

from app.db.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus


class AdminWalletResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    balance: float
    currency: str
    is_active: bool
    created_at: str


class AdminTransactionResponse(BaseModel):
    id: str
    wallet_id: str
    user_name: str
    user_email: str
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    status: str
    reference_type: Optional[str]
    description: Optional[str]
    created_at: str


class WalletStatsResponse(BaseModel):
    total_wallets: int
    total_balance: float
    total_credited: float
    total_debited: float
    active_wallets: int
    transactions_today: int
    transactions_this_month: int


class WalletAdjustment(BaseModel):
    user_id: str
    amount: float
    transaction_type: str  # "CREDIT" or "DEBIT"
    description: str


@router.get("/wallets", response_model=List[AdminWalletResponse])
async def get_all_wallets(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all wallets with user info"""
    query = db.query(Wallet).join(User, Wallet.user_id == User.id)
    
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.first_name.ilike(f"%{search}%")) |
            (User.last_name.ilike(f"%{search}%"))
        )
    
    wallets = query.order_by(desc(Wallet.balance)).offset(skip).limit(limit).all()
    
    result = []
    for w in wallets:
        user = db.query(User).filter(User.id == w.user_id).first()
        result.append(AdminWalletResponse(
            id=str(w.id),
            user_id=str(w.user_id),
            user_name=f"{user.first_name} {user.last_name}" if user else "Unknown",
            user_email=user.email if user else "",
            balance=w.balance,
            currency=w.currency,
            is_active=w.is_active,
            created_at=w.created_at.isoformat() if w.created_at else ""
        ))
    
    return result


@router.get("/wallets/stats", response_model=WalletStatsResponse)
async def get_wallet_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get overall wallet statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_wallets = db.query(func.count(Wallet.id)).scalar() or 0
    total_balance = db.query(func.coalesce(func.sum(Wallet.balance), 0)).scalar() or 0
    active_wallets = db.query(func.count(Wallet.id)).filter(Wallet.is_active == True).scalar() or 0
    
    total_credited = db.query(func.coalesce(func.sum(WalletTransaction.amount), 0)).filter(
        WalletTransaction.transaction_type == TransactionType.CREDIT,
        WalletTransaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    total_debited = db.query(func.coalesce(func.sum(WalletTransaction.amount), 0)).filter(
        WalletTransaction.transaction_type == TransactionType.DEBIT,
        WalletTransaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    transactions_today = db.query(func.count(WalletTransaction.id)).filter(
        WalletTransaction.created_at >= today_start
    ).scalar() or 0
    
    transactions_this_month = db.query(func.count(WalletTransaction.id)).filter(
        WalletTransaction.created_at >= month_start
    ).scalar() or 0
    
    return WalletStatsResponse(
        total_wallets=total_wallets,
        total_balance=float(total_balance),
        total_credited=float(total_credited),
        total_debited=float(total_debited),
        active_wallets=active_wallets,
        transactions_today=transactions_today,
        transactions_this_month=transactions_this_month
    )


@router.get("/transactions", response_model=List[AdminTransactionResponse])
async def get_all_transactions(
    search: Optional[str] = None,
    transaction_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all transactions across all users"""
    query = db.query(WalletTransaction).join(Wallet, WalletTransaction.wallet_id == Wallet.id)
    
    if transaction_type:
        if transaction_type.upper() == "CREDIT":
            query = query.filter(WalletTransaction.transaction_type == TransactionType.CREDIT)
        elif transaction_type.upper() == "DEBIT":
            query = query.filter(WalletTransaction.transaction_type == TransactionType.DEBIT)
    
    transactions = query.order_by(desc(WalletTransaction.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for txn in transactions:
        wallet = db.query(Wallet).filter(Wallet.id == txn.wallet_id).first()
        user = db.query(User).filter(User.id == wallet.user_id).first() if wallet else None
        
        # Apply search filter on user info
        if search:
            search_lower = search.lower()
            if user:
                if not (search_lower in user.email.lower() or 
                        search_lower in user.first_name.lower() or 
                        search_lower in user.last_name.lower()):
                    continue
            else:
                continue
        
        result.append(AdminTransactionResponse(
            id=str(txn.id),
            wallet_id=str(txn.wallet_id),
            user_name=f"{user.first_name} {user.last_name}" if user else "Unknown",
            user_email=user.email if user else "",
            transaction_type=txn.transaction_type.value if txn.transaction_type else "",
            amount=txn.amount,
            balance_before=txn.balance_before,
            balance_after=txn.balance_after,
            status=txn.status.value if txn.status else "",
            reference_type=txn.reference_type,
            description=txn.description,
            created_at=txn.created_at.isoformat() if txn.created_at else ""
        ))
    
    return result


@router.post("/wallets/adjust")
async def adjust_wallet_balance(
    adjustment: WalletAdjustment,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Credit or debit a user's wallet (Admin only)"""
    import uuid as uuid_module
    
    # Validate amount
    if adjustment.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user
    user = db.query(User).filter(User.id == adjustment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()
    if not wallet:
        wallet = Wallet(user_id=user.id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    # Determine transaction type
    if adjustment.transaction_type.upper() == "CREDIT":
        txn_type = TransactionType.CREDIT
        new_balance = wallet.balance + adjustment.amount
    elif adjustment.transaction_type.upper() == "DEBIT":
        txn_type = TransactionType.DEBIT
        if wallet.balance < adjustment.amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        new_balance = wallet.balance - adjustment.amount
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type. Use CREDIT or DEBIT")
    
    # Create transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type=txn_type,
        amount=adjustment.amount,
        balance_before=wallet.balance,
        balance_after=new_balance,
        status=TransactionStatus.COMPLETED,
        reference_type="ADMIN_ADJUSTMENT",
        description=f"Admin adjustment: {adjustment.description}"
    )
    
    # Update wallet balance
    wallet.balance = new_balance
    
    db.add(transaction)
    db.commit()
    
    return {
        "message": f"Successfully {'credited' if txn_type == TransactionType.CREDIT else 'debited'} ₹{adjustment.amount}",
        "new_balance": new_balance,
        "transaction_id": str(transaction.id)
    }


# =====================
# Coupon Management
# =====================

from app.db.models.coupon import Coupon, DiscountType

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "PERCENTAGE"
    discount_value: float
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = 1
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(BaseModel):
    id: str
    code: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    min_order_amount: Optional[float]
    max_discount_amount: Optional[float]
    usage_limit: Optional[int]
    usage_count: int
    per_user_limit: Optional[int]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CouponListResponse(BaseModel):
    coupons: List[CouponResponse]
    total: int
    page: int
    page_size: int


@router.get("/coupons", response_model=CouponListResponse)
async def get_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all coupons with pagination"""
    query = db.query(Coupon)
    
    if search:
        query = query.filter(Coupon.code.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(Coupon.is_active == is_active)
    
    total = query.count()
    coupons = query.order_by(desc(Coupon.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    return CouponListResponse(
        coupons=[CouponResponse(
            id=str(c.id),
            code=c.code,
            description=c.description,
            discount_type=c.discount_type.value,
            discount_value=c.discount_value,
            min_order_amount=c.min_order_amount,
            max_discount_amount=c.max_discount_amount,
            usage_limit=c.usage_limit,
            usage_count=c.usage_count or 0,
            per_user_limit=c.per_user_limit,
            valid_from=c.valid_from,
            valid_until=c.valid_until,
            is_active=c.is_active,
            created_at=c.created_at
        ) for c in coupons],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/coupons", response_model=CouponResponse)
async def create_coupon(
    coupon_data: CouponCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new coupon"""
    # Check if code already exists
    existing = db.query(Coupon).filter(Coupon.code == coupon_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon = Coupon(
        code=coupon_data.code.upper(),
        description=coupon_data.description,
        discount_type=DiscountType(coupon_data.discount_type),
        discount_value=coupon_data.discount_value,
        min_order_amount=coupon_data.min_order_amount,
        max_discount_amount=coupon_data.max_discount_amount,
        usage_limit=coupon_data.usage_limit,
        per_user_limit=coupon_data.per_user_limit,
        valid_from=coupon_data.valid_from,
        valid_until=coupon_data.valid_until,
        is_active=coupon_data.is_active
    )
    
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    
    return CouponResponse(
        id=str(coupon.id),
        code=coupon.code,
        description=coupon.description,
        discount_type=coupon.discount_type.value,
        discount_value=coupon.discount_value,
        min_order_amount=coupon.min_order_amount,
        max_discount_amount=coupon.max_discount_amount,
        usage_limit=coupon.usage_limit,
        usage_count=coupon.usage_count or 0,
        per_user_limit=coupon.per_user_limit,
        valid_from=coupon.valid_from,
        valid_until=coupon.valid_until,
        is_active=coupon.is_active,
        created_at=coupon.created_at
    )


@router.get("/coupons/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get a single coupon"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return CouponResponse(
        id=str(coupon.id),
        code=coupon.code,
        description=coupon.description,
        discount_type=coupon.discount_type.value,
        discount_value=coupon.discount_value,
        min_order_amount=coupon.min_order_amount,
        max_discount_amount=coupon.max_discount_amount,
        usage_limit=coupon.usage_limit,
        usage_count=coupon.usage_count or 0,
        per_user_limit=coupon.per_user_limit,
        valid_from=coupon.valid_from,
        valid_until=coupon.valid_until,
        is_active=coupon.is_active,
        created_at=coupon.created_at
    )


@router.patch("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    coupon_data: CouponUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a coupon"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    update_data = coupon_data.model_dump(exclude_unset=True)
    
    if 'code' in update_data:
        update_data['code'] = update_data['code'].upper()
        existing = db.query(Coupon).filter(Coupon.code == update_data['code'], Coupon.id != coupon_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    if 'discount_type' in update_data:
        update_data['discount_type'] = DiscountType(update_data['discount_type'])
    
    for key, value in update_data.items():
        setattr(coupon, key, value)
    
    db.commit()
    db.refresh(coupon)
    
    return CouponResponse(
        id=str(coupon.id),
        code=coupon.code,
        description=coupon.description,
        discount_type=coupon.discount_type.value,
        discount_value=coupon.discount_value,
        min_order_amount=coupon.min_order_amount,
        max_discount_amount=coupon.max_discount_amount,
        usage_limit=coupon.usage_limit,
        usage_count=coupon.usage_count or 0,
        per_user_limit=coupon.per_user_limit,
        valid_from=coupon.valid_from,
        valid_until=coupon.valid_until,
        is_active=coupon.is_active,
        created_at=coupon.created_at
    )


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(
    coupon_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a coupon"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    db.delete(coupon)
    db.commit()
    
    return {"message": "Coupon deleted successfully"}


@router.post("/coupons/{coupon_id}/toggle")
async def toggle_coupon_status(
    coupon_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle coupon active status"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    coupon.is_active = not coupon.is_active
    db.commit()
    
    return {"message": f"Coupon {'activated' if coupon.is_active else 'deactivated'}", "is_active": coupon.is_active}
