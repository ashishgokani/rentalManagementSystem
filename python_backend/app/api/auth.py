from fastapi import APIRouter, Depends, HTTPException, status, Response, Header, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import uuid
import shutil
from pathlib import Path

from app.db.session import SessionLocal
from app.api.deps import get_db
from app.core.config import settings
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    OTPRequest, OTPVerify, PasswordReset, TokenRefresh,
    MessageResponse, OTPResponse, ReferralCodeValidation,
    UserUpdate
)
from app.db.models.user import User
from app.services import auth_service, email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Dependency to get DB session



@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    existing_user = auth_service.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate referral code if provided
    if user_data.referral_code:
        referrer = auth_service.get_user_by_referral_code(db, user_data.referral_code)
        if not referrer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid referral code"
            )
        if referrer.referral_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This referral code has already been used"
            )
    
    user = auth_service.create_user(db, user_data)
    
    access_token = auth_service.create_access_token({"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=auth_service.user_to_response(user)
    )


@router.get("/validate-referral/{code}", response_model=ReferralCodeValidation)
async def validate_referral_code(code: str, db: Session = Depends(get_db)):
    """Validate a referral code"""
    if not code or len(code) != 8:
        return ReferralCodeValidation(valid=False, message="Invalid referral code format")
    
    referrer = auth_service.get_user_by_referral_code(db, code.upper())
    if not referrer:
        return ReferralCodeValidation(valid=False, message="Invalid referral code")
    
    if referrer.referral_used:
        return ReferralCodeValidation(valid=False, message="This referral code has already been used")
    
    return ReferralCodeValidation(valid=True, message="Valid! You'll get ₹500 bonus on signup")


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token = auth_service.create_access_token({"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=auth_service.user_to_response(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    payload = auth_service.verify_token(token_data.refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user = auth_service.get_user_by_id(db, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token = auth_service.create_access_token({"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=auth_service.user_to_response(user)
    )


# OTP-based Password Reset
@router.post("/forgot-password", response_model=OTPResponse)
async def forgot_password(request: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP to email for password reset"""
    user = auth_service.get_user_by_email(db, request.email)
    if not user:
        # Don't reveal if email exists for security
        return OTPResponse(
            message="If the email exists, an OTP has been sent",
            expires_in_minutes=settings.OTP_EXPIRE_MINUTES
        )
    
    otp = auth_service.store_otp(request.email)
    
    # Send email
    email_service.send_otp_email(request.email, otp)
    
    # Log for debugging (keep until smtp is verified)
    print(f"[DEBUG] OTP for {request.email}: {otp}")
    
    return OTPResponse(
        message="OTP sent to your email",
        expires_in_minutes=settings.OTP_EXPIRE_MINUTES
    )


@router.post("/verify-otp", response_model=MessageResponse)
async def verify_otp(request: OTPVerify):
    """Verify OTP (used before reset password)"""
    is_valid = auth_service.verify_otp(request.email, request.otp, consume=False)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Valid OTP - frontend can proceed to reset password screen
    # We do NOT generate a new token here because the frontend will use the SAME OTP 
    # for the reset-password call, which will consume it.
    
    return MessageResponse(
        message="OTP verified successfully",
        success=True
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: PasswordReset, db: Session = Depends(get_db)):
    """Reset password with OTP"""
    is_valid = auth_service.verify_otp(request.email, request.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    user = auth_service.get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    auth_service.update_user_password(db, user, request.new_password)
    
    return MessageResponse(
        message="Password reset successfully",
        success=True
    )


# OAuth Routes
@router.get("/google")
async def google_login():
    """Redirect to Google OAuth"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )
    auth_url = auth_service.get_google_oauth_url()
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        user_info = await auth_service.get_google_user_info(code)
        email = user_info.get("email")
        given_name = user_info.get("given_name", "")
        family_name = user_info.get("family_name", "")
        
        # Fallback if names not provided
        if not given_name:
            full_name = user_info.get("name", email.split("@")[0])
            name_parts = full_name.split(" ", 1)
            given_name = name_parts[0]
            family_name = name_parts[1] if len(name_parts) > 1 else ""
        
        user = auth_service.get_user_by_email(db, email)
        if not user:
            user = auth_service.create_oauth_user(db, email, given_name, family_name, "google")
        
        access_token = auth_service.create_access_token({"sub": str(user.id)})
        refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
        
        # Redirect to frontend with tokens
        redirect_url = f"{settings.FRONTEND_URL}/oauth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        redirect_url = f"{settings.FRONTEND_URL}/login?error=oauth_failed"
        return RedirectResponse(url=redirect_url)


@router.get("/github")
async def github_login():
    """Redirect to GitHub OAuth"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured"
        )
    auth_url = auth_service.get_github_oauth_url()
    return RedirectResponse(url=auth_url)


@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback"""
    try:
        user_info = await auth_service.get_github_user_info(code)
        email = user_info.get("email")
        
        if not email:
            redirect_url = f"{settings.FRONTEND_URL}/login?error=no_email"
            return RedirectResponse(url=redirect_url)
        
        # Parse name from GitHub
        full_name = user_info.get("name") or user_info.get("login", email.split("@")[0])
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        user = auth_service.get_user_by_email(db, email)
        if not user:
            user = auth_service.create_oauth_user(db, email, first_name, last_name, "github")
        
        access_token = auth_service.create_access_token({"sub": str(user.id)})
        refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
        
        # Redirect to frontend with tokens
        redirect_url = f"{settings.FRONTEND_URL}/oauth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        redirect_url = f"{settings.FRONTEND_URL}/login?error=oauth_failed"
        return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(auth_service.get_current_user)
):
    """Get current authenticated user"""
    return auth_service.user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user)
):
    """Update current user profile"""
    updated_user = auth_service.update_user_profile(db, current_user, user_update)
    return auth_service.user_to_response(updated_user)


# Profile Photo Upload
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@router.post("/profile-photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user)
):
    """Upload profile photo for current user"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename
    unique_filename = f"profile_{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Delete old profile photo if exists
    if current_user.profile_photo:
        # Check if it's a local file path (starts with /uploads/)
        if current_user.profile_photo.startswith("/uploads/"):
             old_filename = current_user.profile_photo.split("/")[-1]
             old_path = UPLOAD_DIR / old_filename
             if old_path.exists():
                 old_path.unlink()
    
    # Save new file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        file.file.close()

    current_user.profile_photo = f"/uploads/{unique_filename}"
    db.commit()
    db.refresh(current_user)
    
    return auth_service.user_to_response(current_user)
