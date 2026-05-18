from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db import get_db
from app.db.models.product import Product
from app.db.models.order import RentalOrder, OrderStatus
from app.db.models.invoice import Invoice, InvoiceStatus
from app.db.models.user import User, UserRole
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# =====================
# Schemas
# =====================

class TopProduct(BaseModel):
    name: str
    rentals: int


class RevenueByMonth(BaseModel):
    month: str
    revenue: float


class OrdersByStatus(BaseModel):
    status: str
    count: int


class DashboardStatsResponse(BaseModel):
    total_revenue: float
    total_orders: int
    active_rentals: int
    pending_returns: int
    total_products: int
    top_products: List[TopProduct]
    revenue_by_month: List[RevenueByMonth]
    orders_by_status: List[OrdersByStatus]


# =====================
# Endpoints
# =====================

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics"""
    
    # Base queries depending on user role
    orders_query = db.query(RentalOrder)
    products_query = db.query(Product)
    invoices_query = db.query(Invoice)
    
    if current_user.role == UserRole.CUSTOMER:
        orders_query = orders_query.filter(RentalOrder.customer_id == current_user.id)
        invoices_query = invoices_query.filter(Invoice.customer_id == current_user.id)
    elif current_user.role == UserRole.VENDOR:
        orders_query = orders_query.filter(RentalOrder.vendor_id == current_user.id)
        products_query = products_query.filter(Product.vendor_id == current_user.id)
    # Admin sees all
    
    # Total revenue from paid invoices
    total_revenue = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).scalar() or 0
    if current_user.role == UserRole.CUSTOMER:
        total_revenue = invoices_query.with_entities(func.coalesce(func.sum(Invoice.paid_amount), 0)).scalar() or 0
    
    # Total orders
    total_orders = orders_query.count()
    
    # Active rentals (PICKED_UP or ACTIVE status)
    active_rentals = orders_query.filter(
        RentalOrder.status.in_([OrderStatus.PICKED_UP, OrderStatus.ACTIVE])
    ).count()
    
    # Pending returns (PICKED_UP and return_date <= now)
    pending_returns = orders_query.filter(
        RentalOrder.status == OrderStatus.PICKED_UP,
        RentalOrder.return_date <= datetime.now()
    ).count()
    
    # Total products
    total_products = products_query.count()
    
    # Top products by rental count
    from app.db.models.order import OrderLine
    top_products_query = db.query(
        OrderLine.product_name,
        func.count(OrderLine.id).label('rentals')
    ).group_by(OrderLine.product_name).order_by(func.count(OrderLine.id).desc()).limit(5).all()
    
    top_products = [
        TopProduct(name=p[0] or "Unknown", rentals=p[1])
        for p in top_products_query
    ]
    
    # Fill with placeholder if no data
    if not top_products:
        top_products = [
            TopProduct(name="No data", rentals=0)
        ]
    
    # Revenue by month (last 6 months)
    revenue_by_month = []
    current_date = datetime.now()
    
    for i in range(5, -1, -1):
        month_date = current_date - timedelta(days=i * 30)
        month_name = month_date.strftime("%b")
        
        month_revenue = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).filter(
            extract('month', Invoice.created_at) == month_date.month,
            extract('year', Invoice.created_at) == month_date.year
        ).scalar() or 0
        
        revenue_by_month.append(RevenueByMonth(month=month_name, revenue=float(month_revenue)))
    
    # Orders by status
    status_counts = db.query(
        RentalOrder.status,
        func.count(RentalOrder.id)
    ).group_by(RentalOrder.status).all()
    
    orders_by_status = [
        OrdersByStatus(status=s[0].value if s[0] else "UNKNOWN", count=s[1])
        for s in status_counts
    ]
    
    # Add missing statuses with 0 count
    existing_statuses = {o.status for o in orders_by_status}
    for status in OrderStatus:
        if status.value not in existing_statuses:
            orders_by_status.append(OrdersByStatus(status=status.value, count=0))
    
    return DashboardStatsResponse(
        total_revenue=float(total_revenue),
        total_orders=total_orders,
        active_rentals=active_rentals,
        pending_returns=pending_returns,
        total_products=total_products,
        top_products=top_products,
        revenue_by_month=revenue_by_month,
        orders_by_status=orders_by_status
    )


@router.get("/recent-orders")
async def get_recent_orders(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent orders"""
    from app.api.orders import order_to_response
    
    query = db.query(RentalOrder)
    
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(RentalOrder.customer_id == current_user.id)
    elif current_user.role == UserRole.VENDOR:
        query = query.filter(RentalOrder.vendor_id == current_user.id)
    
    orders = query.order_by(RentalOrder.created_at.desc()).limit(limit).all()
    
    return [order_to_response(o) for o in orders]


# =====================
# Report Endpoints
# =====================

class VendorPerformance(BaseModel):
    vendor_id: str
    vendor_name: str
    total_orders: int
    total_revenue: float
    total_products: int
    avg_order_value: float


class DailyStats(BaseModel):
    date: str
    day_name: str
    orders: int
    revenue: float


class CategoryStats(BaseModel):
    category_id: str
    category_name: str
    product_count: int
    order_count: int
    revenue: float
    percentage: float


@router.get("/reports/vendor-performance", response_model=List[VendorPerformance])
async def get_vendor_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor performance statistics (Admin only or own stats for vendor)"""
    from app.db.models.order import OrderLine
    
    result = []
    
    if current_user.role == UserRole.ADMIN:
        # Get all vendors
        vendors = db.query(User).filter(User.role == UserRole.VENDOR).all()
    elif current_user.role == UserRole.VENDOR:
        vendors = [current_user]
    else:
        return []
    
    for vendor in vendors:
        # Count orders for this vendor
        orders_count = db.query(RentalOrder).filter(
            RentalOrder.vendor_id == vendor.id
        ).count()
        
        # Calculate revenue from invoices
        revenue = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).join(
            RentalOrder, Invoice.order_id == RentalOrder.id
        ).filter(RentalOrder.vendor_id == vendor.id).scalar() or 0
        
        # Count products
        products_count = db.query(Product).filter(
            Product.vendor_id == vendor.id
        ).count()
        
        avg_order = revenue / orders_count if orders_count > 0 else 0
        
        result.append(VendorPerformance(
            vendor_id=str(vendor.id),
            vendor_name=f"{vendor.first_name} {vendor.last_name}",
            total_orders=orders_count,
            total_revenue=float(revenue),
            total_products=products_count,
            avg_order_value=float(avg_order)
        ))
    
    # Sort by revenue
    result.sort(key=lambda x: x.total_revenue, reverse=True)
    return result[:10]


@router.get("/reports/weekly-stats", response_model=List[DailyStats])
async def get_weekly_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get daily breakdown for the last 7 days"""
    result = []
    today = datetime.now().date()
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        # Base query
        orders_query = db.query(RentalOrder).filter(
            RentalOrder.created_at >= day_start,
            RentalOrder.created_at <= day_end
        )
        
        invoices_query = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).filter(
            Invoice.created_at >= day_start,
            Invoice.created_at <= day_end
        )
        
        # Filter by role
        if current_user.role == UserRole.VENDOR:
            orders_query = orders_query.filter(RentalOrder.vendor_id == current_user.id)
            invoices_query = invoices_query.join(
                RentalOrder, Invoice.order_id == RentalOrder.id
            ).filter(RentalOrder.vendor_id == current_user.id)
        elif current_user.role == UserRole.CUSTOMER:
            orders_query = orders_query.filter(RentalOrder.customer_id == current_user.id)
            invoices_query = invoices_query.filter(Invoice.customer_id == current_user.id)
        
        orders_count = orders_query.count()
        revenue = invoices_query.scalar() or 0
        
        result.append(DailyStats(
            date=day.isoformat(),
            day_name=day.strftime("%a"),
            orders=orders_count,
            revenue=float(revenue)
        ))
    
    return result


@router.get("/reports/category-distribution", response_model=List[CategoryStats])
async def get_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get product and order distribution by category"""
    from app.db.models.product import Category
    from app.db.models.order import OrderLine
    
    categories = db.query(Category).filter(Category.is_active == True).all()
    result = []
    total_revenue = 0
    
    for cat in categories:
        # Product count
        products_query = db.query(Product).filter(Product.category_id == cat.id)
        if current_user.role == UserRole.VENDOR:
            products_query = products_query.filter(Product.vendor_id == current_user.id)
        product_count = products_query.count()
        
        # Order count and revenue from order lines
        orders_subq = db.query(OrderLine).join(
            Product, OrderLine.product_id == Product.id
        ).filter(Product.category_id == cat.id)
        
        if current_user.role == UserRole.VENDOR:
            orders_subq = orders_subq.filter(Product.vendor_id == current_user.id)
        
        order_count = orders_subq.count()
        revenue = orders_subq.with_entities(
            func.coalesce(func.sum(OrderLine.total_price), 0)
        ).scalar() or 0
        
        total_revenue += revenue
        
        result.append({
            'category_id': str(cat.id),
            'category_name': cat.name,
            'product_count': product_count,
            'order_count': order_count,
            'revenue': float(revenue),
            'percentage': 0  # Will calculate after
        })
    
    # Calculate percentages
    for item in result:
        item['percentage'] = (item['revenue'] / total_revenue * 100) if total_revenue > 0 else 0
    
    # Sort by revenue and convert to response model
    result.sort(key=lambda x: x['revenue'], reverse=True)
    return [CategoryStats(**item) for item in result]


@router.get("/reports/export")
async def export_report(
    report_type: str = "orders",
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export report data as CSV"""
    from fastapi.responses import Response
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    if report_type == "orders":
        # Get orders
        query = db.query(RentalOrder)
        if current_user.role == UserRole.VENDOR:
            query = query.filter(RentalOrder.vendor_id == current_user.id)
        elif current_user.role == UserRole.CUSTOMER:
            query = query.filter(RentalOrder.customer_id == current_user.id)
        
        orders = query.order_by(RentalOrder.created_at.desc()).limit(500).all()
        
        # Write header
        writer.writerow(["Order Number", "Status", "Total Amount", "Rental Start", "Rental End", "Created At"])
        
        for order in orders:
            writer.writerow([
                order.order_number,
                order.status.value if order.status else "",
                order.total_amount,
                order.rental_start.isoformat() if order.rental_start else "",
                order.rental_end.isoformat() if order.rental_end else "",
                order.created_at.isoformat() if order.created_at else ""
            ])
    
    elif report_type == "products":
        query = db.query(Product)
        if current_user.role == UserRole.VENDOR:
            query = query.filter(Product.vendor_id == current_user.id)
        
        products = query.all()
        
        writer.writerow(["Name", "Sales Price", "Quantity", "Is Published", "Created At"])
        
        for product in products:
            writer.writerow([
                product.name,
                product.sales_price,
                product.quantity_on_hand,
                product.is_published,
                product.created_at.isoformat() if product.created_at else ""
            ])
    
    elif report_type == "revenue":
        # Revenue by month data
        writer.writerow(["Month", "Revenue"])
        
        current_date = datetime.now()
        for i in range(11, -1, -1):
            month_date = current_date - timedelta(days=i * 30)
            month_revenue = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).filter(
                extract('month', Invoice.created_at) == month_date.month,
                extract('year', Invoice.created_at) == month_date.year
            ).scalar() or 0
            
            writer.writerow([month_date.strftime("%B %Y"), month_revenue])
    
    content = output.getvalue()
    output.close()
    
    filename = f"{report_type}_report.csv"
    
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

