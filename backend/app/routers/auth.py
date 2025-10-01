import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserOut, Token, GoogleAuthRequest
from ..auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    UserCtx,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


# ============ Regular Auth Endpoints ============

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    Returns JWT token and user info.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return Token(
        access_token=access_token,
        user=UserOut.model_validate(new_user),
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password.
    Returns JWT token and user info.
    """
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        user=UserOut.model_validate(user),
    )


# ============ Google OAuth Endpoints ============

@router.post("/google", response_model=Token)
def google_auth(auth_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register a user using Google OAuth.
    Accepts a Google ID token and returns JWT token and user info.
    
    The ID token should be obtained from Google Sign-In on the client side.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID environment variable.",
        )
    
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            auth_data.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        
        # Extract user information from Google
        google_user_id = idinfo["sub"]
        email = idinfo.get("email")
        full_name = idinfo.get("name")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google",
            )
        
        # Check if user exists by google_id or email
        user = db.query(User).filter(
            (User.google_id == google_user_id) | (User.email == email)
        ).first()
        
        if user:
            # Update google_id if user signed up with email first
            if not user.google_id:
                user.google_id = google_user_id
                db.commit()
                db.refresh(user)
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_user_id,
                full_name=full_name,
                hashed_password=None,  # No password for Google-only users
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return Token(
            access_token=access_token,
            user=UserOut.model_validate(user),
        )
    
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )


# ============ User Info Endpoint ============

@router.get("/me", response_model=UserOut)
def get_me(current_user: UserCtx = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get the current authenticated user's information.
    Requires valid JWT token in Authorization header.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserOut.model_validate(user)

