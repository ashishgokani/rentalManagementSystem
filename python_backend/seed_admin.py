"""Seed script to create an admin user"""
import sys
sys.path.insert(0, '.')

from app.db.session import SessionLocal
from app.db.models.user import User, UserRole
from app.services.auth_service import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "vilas.sanskar231@vit.edu").first()
        if existing:
            print("Admin user already exists!")
            return
        
        # Create admin user
        admin = User(
            first_name="Vilas",
            last_name="Sanskar",
            email="vilas.sanskar231@vit.edu",
            password_hash=get_password_hash("Sansku#062005"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully!")
        print(f"Email: vilas.sanskar231@vit.edu")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
