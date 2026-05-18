from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import os
import shutil
from pathlib import Path

from app.db import get_db
from app.db.models.product import Product, Category
from app.db.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/products", tags=["Products"])


# =====================
# Schemas
# =====================

class ProductAttribute(BaseModel):
    name: str
    value: str


class RentalPricing(BaseModel):
    hourly: Optional[float] = None
    daily: Optional[float] = None
    weekly: Optional[float] = None


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    images: List[str] = []
    category_id: Optional[str] = None
    is_rentable: bool = True
    rental_pricing: Optional[RentalPricing] = None
    cost_price: float = 0
    sales_price: float = 0
    quantity_on_hand: int = 0
    is_published: bool = False
    attributes: List[ProductAttribute] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    category_id: Optional[str] = None
    is_rentable: Optional[bool] = None
    rental_pricing: Optional[RentalPricing] = None
    cost_price: Optional[float] = None
    sales_price: Optional[float] = None
    quantity_on_hand: Optional[int] = None
    is_published: Optional[bool] = None
    attributes: Optional[List[ProductAttribute]] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    product_count: int = 0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    images: List[str] = []
    category: Optional[str] = None
    category_id: Optional[str] = None
    is_rentable: bool
    rental_pricing: RentalPricing
    cost_price: float
    sales_price: float
    quantity_on_hand: int
    reserved_quantity: int
    available_quantity: int
    is_published: bool
    vendor_id: str
    vendor_name: str
    attributes: List[ProductAttribute] = []
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


def product_to_response(product: Product) -> ProductResponse:
    vendor_name = ""
    if product.vendor:
        vendor_name = f"{product.vendor.first_name} {product.vendor.last_name}"
    
    category_name = None
    if product.category_rel:
        category_name = product.category_rel.name
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        description=product.description,
        images=product.images or [],
        category=category_name,
        category_id=str(product.category_id) if product.category_id else None,
        is_rentable=product.is_rentable,
        rental_pricing=RentalPricing(
            hourly=product.rental_price_hourly,
            daily=product.rental_price_daily,
            weekly=product.rental_price_weekly
        ),
        cost_price=product.cost_price or 0,
        sales_price=product.sales_price or 0,
        quantity_on_hand=product.quantity_on_hand or 0,
        reserved_quantity=product.reserved_quantity or 0,
        available_quantity=product.available_quantity,
        is_published=product.is_published,
        vendor_id=str(product.vendor_id) if product.vendor_id else "",
        vendor_name=vendor_name,
        attributes=[ProductAttribute(**attr) for attr in (product.attributes or [])],
        created_at=product.created_at.isoformat() if product.created_at else "",
        updated_at=product.updated_at.isoformat() if product.updated_at else ""
    )


# =====================
# Image Upload Endpoint
# =====================

# Configure upload directory
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a product image (vendors and admins only)"""
    from app.db.models.user import UserRole
    
    if current_user.role not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only vendors and admins can upload images")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        file.file.close()
    
    # Return URL path (will be served via static files)
    image_url = f"/uploads/{unique_filename}"
    
    return {"url": image_url, "filename": unique_filename}


# =====================
# Category Endpoints
# =====================
@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories with product counts"""
    from sqlalchemy import func
    
    # Get categories with product count
    categories = db.query(Category).filter(Category.is_active == True).all()
    
    result = []
    for c in categories:
        product_count = db.query(func.count(Product.id)).filter(Product.category_id == c.id).scalar() or 0
        result.append(CategoryResponse(
            id=str(c.id),
            name=c.name,
            description=c.description,
            is_active=c.is_active,
            product_count=product_count,
            created_at=c.created_at.isoformat() if hasattr(c, 'created_at') and c.created_at else None
        ))
    return result


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new category (vendor or admin only)"""
    from app.db.models.user import UserRole
    if current_user.role not in [UserRole.ADMIN, UserRole.VENDOR]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category = Category(name=data.name, description=data.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        product_count=0,
        created_at=category.created_at.isoformat() if category.created_at else None
    )


# =====================
# Product Endpoints
# =====================

@router.get("", response_model=List[ProductResponse])
async def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    vendor_id: Optional[str] = None,
    sort_by: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all products with optional filters"""
    query = db.query(Product)
    
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )
    
    if category:
        cat = db.query(Category).filter(Category.name == category).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
    
    if is_published is not None:
        query = query.filter(Product.is_published == is_published)
    
    if vendor_id:
        query = query.filter(Product.vendor_id == uuid.UUID(vendor_id))
    
    # Sorting
    if sort_by == 'price_asc':
        # Default to daily rental price for sorting
        query = query.order_by(Product.rental_price_daily.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.rental_price_daily.desc())
    elif sort_by == 'quantity_asc':
        query = query.order_by((Product.quantity_on_hand - Product.reserved_quantity).asc())
    elif sort_by == 'quantity_desc':
        query = query.order_by((Product.quantity_on_hand - Product.reserved_quantity).desc())
    else:
        # Default sort by creation
        query = query.order_by(Product.created_at.desc())
    
    products = query.offset(skip).limit(limit).all()
    return [product_to_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by ID"""
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_response(product)


@router.post("", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product (vendor only)"""
    from app.db.models.user import UserRole
    if current_user.role not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only vendors can create products")
    
    product = Product(
        vendor_id=current_user.id,
        name=data.name,
        description=data.description,
        images=data.images,
        category_id=uuid.UUID(data.category_id) if data.category_id else None,
        is_rentable=data.is_rentable,
        rental_price_hourly=data.rental_pricing.hourly if data.rental_pricing else None,
        rental_price_daily=data.rental_pricing.daily if data.rental_pricing else None,
        rental_price_weekly=data.rental_pricing.weekly if data.rental_pricing else None,
        cost_price=data.cost_price,
        sales_price=data.sales_price,
        quantity_on_hand=data.quantity_on_hand,
        is_published=data.is_published,
        attributes=[attr.model_dump() for attr in data.attributes]
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product_to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a product"""
    from app.db.models.user import UserRole
    
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check ownership or admin
    if current_user.role != UserRole.ADMIN and product.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    if data.name is not None:
        product.name = data.name
    if data.description is not None:
        product.description = data.description
    if data.images is not None:
        product.images = data.images
    if data.category_id is not None:
        product.category_id = uuid.UUID(data.category_id) if data.category_id else None
    if data.is_rentable is not None:
        product.is_rentable = data.is_rentable
    if data.rental_pricing is not None:
        product.rental_price_hourly = data.rental_pricing.hourly
        product.rental_price_daily = data.rental_pricing.daily
        product.rental_price_weekly = data.rental_pricing.weekly
    if data.cost_price is not None:
        product.cost_price = data.cost_price
    if data.sales_price is not None:
        product.sales_price = data.sales_price
    if data.quantity_on_hand is not None:
        product.quantity_on_hand = data.quantity_on_hand
    if data.is_published is not None:
        product.is_published = data.is_published
    if data.attributes is not None:
        product.attributes = [attr.model_dump() for attr in data.attributes]
    
    db.commit()
    db.refresh(product)
    
    return product_to_response(product)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product"""
    from app.db.models.user import UserRole
    
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if current_user.role != UserRole.ADMIN and product.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}
