from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.db import get_db
from app.services import auth_service
from app.db.models.user import User
from app.services.calendar_service import calendar_service
from app.db.models.order import RentalOrder

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

@router.get("/connect")
async def connect_calendar(current_user: User = Depends(auth_service.get_current_user)):
    """Get Google Calendar Connect URL"""
    return {"url": calendar_service.get_auth_url()}

class CalendarCallback(BaseModel):
    code: str

@router.post("/callback")
async def calendar_callback(
    data: CalendarCallback, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth_service.get_current_user)
):
    """Handle Callback and save Refresh Token"""
    try:
        creds = calendar_service.get_credentials(data.code)
        
        if creds.refresh_token:
            current_user.google_refresh_token = creds.refresh_token
            db.commit()
            return {"message": "Calendar connected successfully"}
        else:
            # If we didn't get a refresh token, it might be because the user
            # has already authorized the app and we didn't force consent.
            # But we are using prompt='consent' in the service, so we should get it.
            # If still missing, check if we already have one
            if current_user.google_refresh_token:
                 return {"message": "Connected (Using existing refresh token)"}
            
            return {"message": "Connected but no refresh token received. Revoke access in Google Account to reset.", "warning": "No refresh token"}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect calendar: {str(e)}")

class SyncOrderRequest(BaseModel):
    order_id: str

@router.post("/sync-order")
async def sync_order(
    data: SyncOrderRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth_service.get_current_user)
):
    """Sync specific order to calendar"""
    if not current_user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Calendar not connected")
        
    order = db.query(RentalOrder).filter(RentalOrder.id == uuid.UUID(data.order_id)).first()
    if not order:
         raise HTTPException(status_code=404, detail="Order not found")
         
    # Check authorization (Vendor or Customer can sync)
    if order.customer_id != current_user.id and order.vendor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    try:
        # Event 1: Pickup
        # Use pickup_date if available (actual pickup), otherwise rental_start_date (scheduled)
        pickup_time = order.pickup_date if order.pickup_date else order.rental_start_date
        
        pickup_summary = f"Pickup: Rental #{order.order_number}"
        pickup_desc = f"Pickup Order #{order.order_number}\nItems: {len(order.lines)}\nStatus: {order.status}"
        
        link1 = calendar_service.create_event(
            current_user.google_refresh_token,
            pickup_summary,
            pickup_time,
            pickup_time + timedelta(hours=1),
            pickup_desc
        )

        # Event 2: Return
        # Based on rental_end_date (Due Date)
        return_time = order.rental_end_date
        return_summary = f"Return: Rental #{order.order_number}"
        return_desc = f"Return Due for Order #{order.order_number}"
        
        link2 = calendar_service.create_event(
            current_user.google_refresh_token,
            return_summary,
            return_time,
            return_time + timedelta(hours=1),
            return_desc
        )

        return {"message": "Events created", "links": [link1, link2]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
