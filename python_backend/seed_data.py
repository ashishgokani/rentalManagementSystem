"""
Seed script to populate all database tables with sample data.
Run from the backend directory: python seed_data.py
"""

import sys
import os
from datetime import datetime, timedelta
import random
import uuid

# Add the app to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db.models.user import User, UserRole
from app.db.models.product import Product, Category
from app.db.models.order import RentalOrder, OrderLine, OrderStatus
from app.db.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.db.models.invoice import Invoice, InvoiceLine, Payment, InvoiceStatus, PaymentMethod, PaymentStatus
from app.db.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus
from app.services.auth_service import get_password_hash


def generate_order_number():
    return f"ORD-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"


def generate_quotation_number():
    return f"QUO-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"


def generate_invoice_number():
    return f"INV-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"


def seed_users(db: Session):
    """Create sample users: admin, vendors, and customers"""
    print("Seeding users...")
    
    users = []
    
    # Admin user
    admin = User(
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        phone="9876543210",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
        address="123 Admin St",
        city="Mumbai",
        state="Maharashtra",
        postal_code="400001",
        country="India"
    )
    users.append(admin)
    
    # Vendor users
    vendors_data = [
        {
            "first_name": "Aditya",
            "last_name": "Kulkarni",
            "email": "kulkarni@trekrentals.com",
            "phone": "9876543211",
            "company_name": "Kulkarni Trekking & Outdoors",
            "business_category": "Trekking & Camping",
            "gstin": "27AABCU9603R1ZM",
            "address": "45 Adventure Hub",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411001"
        },
        {
            "first_name": "Priya",
            "last_name": "Sharma",
            "email": "priya@eventrentals.com",
            "phone": "9876543212",
            "company_name": "Sharma Event Supplies",
            "business_category": "Events & Parties",
            "gstin": "29AADCS1234F1ZN",
            "address": "12 Celebration Plaza",
            "city": "Bangalore",
            "state": "Karnataka",
            "postal_code": "560001"
        },
        {
            "first_name": "Vikram",
            "last_name": "Lensman",
            "email": "vikram@camerarentals.com",
            "phone": "9876543213",
            "company_name": "ProCam Rentals",
            "business_category": "Photography",
            "gstin": "33AABCA5678G1ZO",
            "address": "78 Studio Lane",
            "city": "Hyderabad",
            "state": "Telangana",
            "postal_code": "500001"
        },
        {
            "first_name": "Anita",
            "last_name": "Patel",
            "email": "anita@partyrentals.com",
            "phone": "9876543214",
            "company_name": "City Daily Rentals",
            "business_category": "General Utilities",
            "gstin": "24AABCP9012H1ZP",
            "address": "90 Market Road",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "postal_code": "380001"
        }
    ]
    
    vendors = []
    for v_data in vendors_data:
        vendor = User(
            first_name=v_data["first_name"],
            last_name=v_data["last_name"],
            email=v_data["email"],
            phone=v_data["phone"],
            password_hash=get_password_hash("vendor123"),
            role=UserRole.VENDOR,
            company_name=v_data["company_name"],
            business_category=v_data["business_category"],
            gstin=v_data["gstin"],
            is_active=True,
            address=v_data["address"],
            city=v_data["city"],
            state=v_data["state"],
            postal_code=v_data["postal_code"],
            country="India"
        )
        users.append(vendor)
        vendors.append(vendor)
    
    # Customer users
    customers_data = [
        {"first_name": "Amit", "last_name": "Singh", "email": "amit@email.com", "phone": "9988776655", "city": "Delhi"},
        {"first_name": "Sneha", "last_name": "Reddy", "email": "sneha@email.com", "phone": "9988776656", "city": "Hyderabad"},
        {"first_name": "Arjun", "last_name": "Kapoor", "email": "arjun@email.com", "phone": "9988776657", "city": "Mumbai"},
        {"first_name": "Deepika", "last_name": "Nair", "email": "deepika@email.com", "phone": "9988776658", "city": "Bangalore"},
        {"first_name": "Suresh", "last_name": "Menon", "email": "suresh@email.com", "phone": "9988776659", "city": "Chennai"},
        {"first_name": "Kavita", "last_name": "Gupta", "email": "kavita@email.com", "phone": "9988776660", "city": "Kolkata"},
    ]
    
    customers = []
    for c_data in customers_data:
        customer = User(
            first_name=c_data["first_name"],
            last_name=c_data["last_name"],
            email=c_data["email"],
            phone=c_data["phone"],
            password_hash=get_password_hash("customer123"),
            role=UserRole.CUSTOMER,
            is_active=True,
            address="Residential Complex",
            city=c_data["city"],
            state="State",
            postal_code="100001",
            country="India"
        )
        users.append(customer)
        customers.append(customer)
    
    db.add_all(users)
    db.commit()
    
    print(f"  Created {len(users)} users (1 admin, {len(vendors)} vendors, {len(customers)} customers)")
    return admin, vendors, customers


def seed_categories(db: Session):
    """Create product categories"""
    print("Seeding categories...")
    
    categories_data = [
        {"name": "Trekking & Camping", "description": "Tents, sleeping bags, backpacks, and safety gear"},
        {"name": "Photography & AV", "description": "Cameras, lenses, tripods, drones, and lighting"},
        {"name": "Event & Party", "description": "Speakers, projectors, chairs, tables, and decor"},
        {"name": "Daily Utilities", "description": "Tools, ladders, cleaning equipment, and appliances"},
        {"name": "Holiday Equipment", "description": "Suitcases, travel gear, skiing equipment, and beach gear"},
        {"name": "Electronics", "description": "Laptops, tablets, gaming consoles, and VR headsets"}
    ]
    
    categories = []
    for cat_data in categories_data:
        category = Category(
            name=cat_data["name"],
            description=cat_data["description"],
            is_active=True
        )
        categories.append(category)
    
    db.add_all(categories)
    db.commit()
    
    print(f"  Created {len(categories)} categories")
    return categories


def seed_products(db: Session, vendors, categories):
    """Create sample products"""
    print("Seeding products...")
    
    # Map vendors by index for clearer assignment
    # 0: Kulkarni (Trekking)
    # 1: Sharma (Events)
    # 2: ProCam (Photography)
    # 3: City Daily (Utilities/General)
    
    products_data = [
        # --- Trekking & Camping (Vendor 0) ---
        {
            "name": "Quechua 4-Person Camping Tent",
            "description": "Waterproof, wind-resistant pop-up tent. Easy installation.",
            "category": "Trekking & Camping",
            "vendor_idx": 0,
            "rental_price_daily": 500,
            "rental_price_weekly": 1500,
            "cost_price": 8000,
            "sales_price": 0, # Not for sale
            "quantity": 10,
            "images": ["https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800"]
        },
        {
            "name": "Trekking Rucksack 60L",
            "description": "Ergonomic hiking backpack with rain cover and multiple compartments.",
            "category": "Trekking & Camping",
            "vendor_idx": 0,
            "rental_price_daily": 200,
            "rental_price_weekly": 800,
            "cost_price": 4000,
            "sales_price": 0,
            "quantity": 15,
            "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]
        },
        {
            "name": "Sleeping Bag (-5°C)",
            "description": "Thermal sleeping bag appropriate for himalayan treks.",
            "category": "Trekking & Camping",
            "vendor_idx": 0,
            "rental_price_daily": 150,
            "rental_price_weekly": 600,
            "cost_price": 3000,
            "sales_price": 0,
            "quantity": 20,
            "images": ["https://images.unsplash.com/photo-1627662168806-432540623635?w=800"]
        },
        {
            "name": "GoPro Hero 11 Black",
            "description": "Action camera for capturing your adventures. 5.3K video.",
            "category": "Photography & AV", # Cross category
            "vendor_idx": 0,
            "rental_price_daily": 800,
            "rental_price_weekly": 3500,
            "cost_price": 45000,
            "sales_price": 0,
            "quantity": 5,
            "images": ["https://images.unsplash.com/photo-1564463836205-4d3cb77cdcf9?w=800"]
        },

        # --- Photography & AV (Vendor 2) ---
        {
            "name": "Sony Alpha a7 III Kit",
            "description": "Full-frame mirrorless camera with 28-70mm lens. Perfect for weddings and events.",
            "category": "Photography & AV",
            "vendor_idx": 2,
            "rental_price_daily": 2500,
            "rental_price_weekly": 10000,
            "cost_price": 160000,
            "sales_price": 180000,
            "quantity": 4,
            "images": ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"]
        },
        {
            "name": "Canon EF 70-200mm f/2.8L",
            "description": "Telephoto zoom lens. Industry standard for sports and portraits.",
            "category": "Photography & AV",
            "vendor_idx": 2,
            "rental_price_daily": 1500,
            "rental_price_weekly": 6000,
            "cost_price": 140000,
            "sales_price": 0,
            "quantity": 3,
            "images": ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800"]
        },
        {
            "name": "DJI Mavic Air 2 Drone",
            "description": "4K Drone for aerial photography.",
            "category": "Photography & AV",
            "vendor_idx": 2,
            "rental_price_daily": 2000,
            "rental_price_weekly": 8000,
            "cost_price": 80000,
            "sales_price": 0,
            "quantity": 2,
            "images": ["https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800"]
        },
        {
            "name": "Godox SL60W Studio Light",
            "description": "Continuous LED video light for content creators.",
            "category": "Photography & AV",
            "vendor_idx": 2,
            "rental_price_daily": 500,
            "rental_price_weekly": 2000,
            "cost_price": 12000,
            "sales_price": 0,
            "quantity": 6,
            "images": ["https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?w=800"]
        },

        # --- Event & Party (Vendor 1) ---
        {
            "name": "JBL PartyBox 710",
            "description": "800W RMS powerful sound with built-in light show.",
            "category": "Event & Party",
            "vendor_idx": 1,
            "rental_price_daily": 3000,
            "rental_price_weekly": 12000,
            "cost_price": 65000,
            "sales_price": 0,
            "quantity": 4,
            "images": ["https://images.unsplash.com/photo-1545665277-5937a5953929?w=800"]
        },
        {
            "name": "Epson Home Cinema Projector",
            "description": "1080p projector for movie nights or presentations.",
            "category": "Event & Party",
            "vendor_idx": 1,
            "rental_price_daily": 1000,
            "rental_price_weekly": 4000,
            "cost_price": 60000,
            "sales_price": 0,
            "quantity": 5,
            "images": ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800"]
        },
        {
            "name": "Folding Tables (6ft)",
            "description": "Sturdy tables for buffet or seating.",
            "category": "Event & Party",
            "vendor_idx": 1,
            "rental_price_daily": 300,
            "rental_price_weekly": 1000,
            "cost_price": 4000,
            "sales_price": 0,
            "quantity": 20,
            "images": ["https://images.unsplash.com/photo-1577140917170-285929cf55b7?w=800"]
        },
        {
            "name": "Chiavari Gold Chairs",
            "description": "Premium event chairs with cushions.",
            "category": "Event & Party",
            "vendor_idx": 1,
            "rental_price_daily": 150,
            "rental_price_weekly": 500,
            "cost_price": 3000,
            "sales_price": 0,
            "quantity": 50,
            "images": ["https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800"]
        },

        # --- Daily Utilities (Vendor 3) ---
        {
            "name": "Bosch Professional Drill Kit",
            "description": "Impact drill with full bit set.",
            "category": "Daily Utilities",
            "vendor_idx": 3,
            "rental_price_hourly": 100,
            "rental_price_daily": 400,
            "rental_price_weekly": 1500,
            "cost_price": 8000,
            "sales_price": 0,
            "quantity": 8,
            "images": ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800"]
        },
        {
            "name": "Aluminum Extension Ladder (20ft)",
            "description": "Heavy duty extendable ladder.",
            "category": "Daily Utilities",
            "vendor_idx": 3,
            "rental_price_hourly": 200,
            "rental_price_daily": 600,
            "rental_price_weekly": 2000,
            "cost_price": 12000,
            "sales_price": 0,
            "quantity": 4,
            "images": ["https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800"]
        },
        {
            "name": "Karcher High Pressure Washer",
            "description": "Car and patio cleaner.",
            "category": "Daily Utilities",
            "vendor_idx": 3,
            "rental_price_hourly": 250,
            "rental_price_daily": 800,
            "rental_price_weekly": 3000,
            "cost_price": 15000,
            "sales_price": 0,
            "quantity": 3,
            "images": ["https://images.unsplash.com/photo-1520340356584-299638b950b9?w=800"]
        },

        # --- Holiday Equipment (Vendor 3) ---
        {
            "name": "Samsonite Hard Shell Suitcase (Set of 2)",
            "description": "Large and carry-on luggage set.",
            "category": "Holiday Equipment",
            "vendor_idx": 3,
            "rental_price_daily": 400,
            "rental_price_weekly": 2000,
            "cost_price": 18000,
            "sales_price": 0,
            "quantity": 6,
            "images": ["https://images.unsplash.com/photo-1565538810643-b5bdbfe78f0d?w=800"]
        },
        {
            "name": "Barbecue Grill Station",
            "description": "Portable charcoal grill for picnics.",
            "category": "Holiday Equipment",
            "vendor_idx": 3,
            "rental_price_daily": 500,
            "rental_price_weekly": 2500,
            "cost_price": 5000,
            "sales_price": 0,
            "quantity": 5,
            "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"]
        },
        
         # --- Electronics (Vendor 0 - Kulkarni) ---
        {
            "name": "PlayStation 5 Console",
            "description": "PS5 with 2 controllers and 3 games.",
            "category": "Electronics",
            "vendor_idx": 0,
            "rental_price_daily": 1500,
            "rental_price_weekly": 6000,
            "cost_price": 55000,
            "sales_price": 0,
            "quantity": 3,
            "images": ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"]
        },
        {
            "name": "Oculus Quest 2 VR Headset",
            "description": "All-in-one VR gaming headset.",
            "category": "Electronics",
            "vendor_idx": 0,
            "rental_price_daily": 1200,
            "rental_price_weekly": 5000,
            "cost_price": 40000,
            "sales_price": 0,
            "quantity": 2,
            "images": ["https://images.unsplash.com/photo-1622979135225-d2ba269fb1bd?w=800"]
        }
    ]
    
    # Create category lookup
    category_map = {cat.name: cat for cat in categories}
    
    products = []
    for p_data in products_data:
        category = category_map.get(p_data["category"])
        vendor = vendors[p_data["vendor_idx"]]
        
        product = Product(
            vendor_id=vendor.id,
            category_id=category.id if category else None,
            name=p_data["name"],
            description=p_data["description"],
            images=p_data.get("images", []),
            is_rentable=True,
            rental_price_hourly=p_data.get("rental_price_hourly"),
            rental_price_daily=p_data.get("rental_price_daily"),
            rental_price_weekly=p_data.get("rental_price_weekly"),
            cost_price=p_data.get("cost_price", 0),
            sales_price=p_data.get("sales_price", 0),
            quantity_on_hand=p_data.get("quantity", 1),
            reserved_quantity=0,
            is_published=True,
            attributes=[]
        )
        products.append(product)
    
    db.add_all(products)
    db.commit()
    
    print(f"  Created {len(products)} products")
    return products


def seed_wallets(db: Session, users):
    """Create wallets for all users"""
    print("Seeding wallets...")
    
    wallets = []
    for user in users:
        initial_balance = random.choice([0, 500, 1000, 2000, 5000]) if user.role == UserRole.CUSTOMER else 0
        
        wallet = Wallet(
            user_id=user.id,
            balance=initial_balance,
            currency="INR",
            is_active=True
        )
        wallets.append(wallet)
    
    db.add_all(wallets)
    db.commit()
    
    # Add some transactions for wallets with balance
    transactions = []
    for wallet in wallets:
        if wallet.balance > 0:
            transaction = WalletTransaction(
                wallet_id=wallet.id,
                transaction_type=TransactionType.CREDIT,
                amount=wallet.balance,
                balance_before=0,
                balance_after=wallet.balance,
                status=TransactionStatus.COMPLETED,
                reference_type="TOPUP",
                description="Initial wallet top-up"
            )
            transactions.append(transaction)
    
    if transactions:
        db.add_all(transactions)
        db.commit()
    
    print(f"  Created {len(wallets)} wallets with {len(transactions)} transactions")
    return wallets


def seed_quotations(db: Session, customers, products):
    """Create sample quotations"""
    print("Seeding quotations...")
    
    quotations = []
    quotation_lines = []
    
    for i, customer in enumerate(customers[:5]):
        # Create 1-2 quotations per customer
        num_quotations = random.randint(1, 2)
        
        for _ in range(num_quotations):
            selected_products = random.sample(products, random.randint(1, 3))
            
            subtotal = 0
            lines_data = []
            
            start_date = datetime.now() + timedelta(days=random.randint(5, 30))
            end_date = start_date + timedelta(days=random.randint(1, 7))
            
            for product in selected_products:
                quantity = random.randint(1, min(3, product.quantity_on_hand))
                unit_price = product.rental_price_daily or product.rental_price_weekly/7 or 1000
                days = (end_date - start_date).days or 1
                total_price = unit_price * quantity * days
                subtotal += total_price
                
                lines_data.append({
                    "product": product,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "start_date": start_date,
                    "end_date": end_date
                })
            
            tax_amount = subtotal * 0.18
            total_amount = subtotal + tax_amount
            
            # 80% Draft, 20% Sent
            status = random.choice([QuotationStatus.DRAFT, QuotationStatus.DRAFT, QuotationStatus.SENT])
            
            quotation = Quotation(
                quotation_number=generate_quotation_number(),
                customer_id=customer.id,
                status=status,
                subtotal=subtotal,
                tax_rate=18,
                tax_amount=tax_amount,
                total_amount=total_amount,
                valid_until=datetime.now() + timedelta(days=30),
                notes="Sample quotation for rental equipment"
            )
            quotations.append(quotation)
            db.add(quotation)
            db.flush()  # Get the quotation ID
            
            for line_data in lines_data:
                line = QuotationLine(
                    quotation_id=quotation.id,
                    product_id=line_data["product"].id,
                    product_name=line_data["product"].name,
                    quantity=line_data["quantity"],
                    rental_period_type="day",
                    rental_start_date=line_data["start_date"],
                    rental_end_date=line_data["end_date"],
                    unit_price=line_data["unit_price"],
                    total_price=line_data["total_price"]
                )
                quotation_lines.append(line)
    
    db.add_all(quotation_lines)
    db.commit()
    
    print(f"  Created {len(quotations)} quotations with {len(quotation_lines)} lines")
    return quotations


def seed_orders(db: Session, customers, vendors, products):
    """Create sample rental orders"""
    print("Seeding orders...")
    
    orders = []
    order_lines = []
    
    # Group products by vendor
    vendor_products = {}
    for product in products:
        if product.vendor_id not in vendor_products:
            vendor_products[product.vendor_id] = []
        vendor_products[product.vendor_id].append(product)
    
    statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.ACTIVE, 
                OrderStatus.COMPLETED, OrderStatus.PICKED_UP, OrderStatus.RETURNED]
    
    for customer in customers[:6]:
        # Create 1-3 orders per customer
        num_orders = random.randint(1, 3)
        
        for _ in range(num_orders):
            # Pick a random vendor
            vendor = random.choice(vendors)
            vendor_prods = vendor_products.get(vendor.id, products[:3])
            
            selected_products = random.sample(vendor_prods, min(random.randint(1, 3), len(vendor_prods)))
            
            subtotal = 0
            lines_data = []
            
            days_offset = random.randint(-30, 15)
            start_date = datetime.now() + timedelta(days=days_offset)
            end_date = start_date + timedelta(days=random.randint(1, 7))
            
            for product in selected_products:
                quantity = random.randint(1, 2)
                unit_price = product.rental_price_daily or product.rental_price_weekly/7 or 1000
                days = (end_date - start_date).days or 1
                total_price = unit_price * quantity * days
                subtotal += total_price
                
                lines_data.append({
                    "product": product,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "start_date": start_date,
                    "end_date": end_date
                })
            
            tax_amount = subtotal * 0.18
            security_deposit = subtotal * 0.2  # 20% security deposit
            total_amount = subtotal + tax_amount + security_deposit
            
            status = random.choice(statuses)
            paid_amount = total_amount if status in [OrderStatus.COMPLETED, OrderStatus.ACTIVE, OrderStatus.PICKED_UP, OrderStatus.RETURNED] else (total_amount * 0.5 if status == OrderStatus.CONFIRMED else 0)
            
            order = RentalOrder(
                order_number=generate_order_number(),
                customer_id=customer.id,
                vendor_id=vendor.id,
                status=status,
                subtotal=subtotal,
                tax_rate=18,
                tax_amount=tax_amount,
                security_deposit=security_deposit,
                total_amount=total_amount,
                paid_amount=paid_amount,
                rental_start_date=start_date,
                rental_end_date=end_date,
                pickup_date=start_date if status in [OrderStatus.ACTIVE, OrderStatus.PICKED_UP, OrderStatus.COMPLETED, OrderStatus.RETURNED] else None,
                return_date=end_date if status in [OrderStatus.COMPLETED, OrderStatus.RETURNED] else None,
                notes="Sample rental order"
            )
            orders.append(order)
            db.add(order)
            db.flush()
            
            for line_data in lines_data:
                line = OrderLine(
                    order_id=order.id,
                    product_id=line_data["product"].id,
                    product_name=line_data["product"].name,
                    quantity=line_data["quantity"],
                    rental_period_type="day",
                    rental_start_date=line_data["start_date"],
                    rental_end_date=line_data["end_date"],
                    unit_price=line_data["unit_price"],
                    total_price=line_data["total_price"]
                )
                order_lines.append(line)
    
    db.add_all(order_lines)
    db.commit()
    
    print(f"  Created {len(orders)} orders with {len(order_lines)} lines")
    return orders


def seed_invoices(db: Session, orders, customers):
    """Create invoices for completed/active orders"""
    print("Seeding invoices...")
    
    invoices = []
    invoice_lines = []
    payments = []
    
    # Create invoices for orders that are confirmed or beyond
    eligible_orders = [o for o in orders if o.status in [OrderStatus.CONFIRMED, OrderStatus.ACTIVE, OrderStatus.COMPLETED, OrderStatus.RETURNED, OrderStatus.PICKED_UP]]
    
    for order in eligible_orders:
        status = InvoiceStatus.PAID if order.paid_amount >= order.total_amount else InvoiceStatus.SENT
        
        invoice = Invoice(
            invoice_number=generate_invoice_number(),
            order_id=order.id,
            customer_id=order.customer_id,
            status=status,
            subtotal=order.subtotal,
            tax_rate=order.tax_rate,
            tax_amount=order.tax_amount,
            total_amount=order.total_amount,
            paid_amount=order.paid_amount,
            due_date=datetime.now() + timedelta(days=30),
            notes="Invoice for rental order"
        )
        invoices.append(invoice)
        db.add(invoice)
        db.flush()
        
        # Create invoice lines from order
        for order_line in order.lines:
            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                description=f"{order_line.product_name} rental",
                quantity=order_line.quantity,
                unit_price=order_line.unit_price,
                total_price=order_line.total_price
            )
            invoice_lines.append(inv_line)
        
        # Add deposit line if applicable
        if order.security_deposit > 0:
             # Just checking if we usually add it as a line item. 
             # In prev seed it was added.
            deposit_line = InvoiceLine(
                invoice_id=invoice.id,
                description="Security Deposit",
                quantity=1,
                unit_price=order.security_deposit,
                total_price=order.security_deposit
            )
            invoice_lines.append(deposit_line)
        
        # Create payment record for paid invoices
        if invoice.paid_amount > 0:
            payment_date = order.created_at # Approximate
            payment = Payment(
                invoice_id=invoice.id,
                amount=invoice.paid_amount,
                method=random.choice([PaymentMethod.ONLINE, PaymentMethod.CARD, PaymentMethod.WALLET]),
                status=PaymentStatus.COMPLETED,
                transaction_id=f"TXN{random.randint(100000, 999999)}"
            )
            payments.append(payment)
    
    db.add_all(invoice_lines)
    db.add_all(payments)
    db.commit()
    
    print(f"  Created {len(invoices)} invoices with {len(invoice_lines)} lines and {len(payments)} payments")
    return invoices


def clear_all_data(db: Session):
    """Clear all data from tables (in correct order due to foreign keys)"""
    print("Clearing existing data...")
    
    db.query(WalletTransaction).delete()
    db.query(Wallet).delete()
    db.query(Payment).delete()
    db.query(InvoiceLine).delete()
    db.query(Invoice).delete()
    db.query(OrderLine).delete()
    db.query(RentalOrder).delete()
    db.query(QuotationLine).delete()
    db.query(Quotation).delete()
    db.query(Product).delete()
    db.query(Category).delete()
    db.query(User).delete()
    
    db.commit()
    print("  All data cleared")


def main():
    print("\n" + "="*50)
    print("  SEED DATA SCRIPT")
    print("="*50 + "\n")
    
    db = SessionLocal()
    
    try:
        # Clear existing data
        clear_all_data(db)
        
        # Seed in order (respecting foreign key constraints)
        admin, vendors, customers = seed_users(db)
        all_users = [admin] + vendors + customers
        
        categories = seed_categories(db)
        products = seed_products(db, vendors, categories)
        wallets = seed_wallets(db, all_users)
        quotations = seed_quotations(db, customers, products)
        orders = seed_orders(db, customers, vendors, products)
        invoices = seed_invoices(db, orders, customers)
        
        print("\n" + "="*50)
        print("  SEEDING COMPLETE!")
        print("="*50)
        print("\nLogin credentials:")
        print("-" * 30)
        print("Admin:    admin@example.com / admin123")
        print("Vendor:   kulkarni@trekrentals.com / vendor123")
        print("Customer: amit@email.com / customer123")
        print("-" * 30 + "\n")
        
    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
