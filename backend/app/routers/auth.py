import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from ..database import get_db
from ..models import User
from ..audit import create_audit_log, get_actor_ip
from ..schemas import UserCreate, UserLogin, UserOut, Token, GoogleAuthRequest, UserProfileUpdate, PasswordChange
from ..auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    token_cookie,
    UserCtx,
)
from ..payment import create_stripe_customer

# google oauth configuration

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# oauth client
oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"}
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ============ Regular Auth Endpoints ============

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
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
        stripe_customer_id=create_stripe_customer(email=user_data.email).id  # create stripe customer
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create audit log for new user registration
    create_audit_log(
        db=db,
        action_type="user_registered",
        target_type="user",
        target_id=new_user.id,
        actor_id=new_user.id,  # User is their own actor for registration
        actor_email=new_user.email,
        details={
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
        },
        ip_address=get_actor_ip(request),
    )
    
    # create jwt and set cookie
    token_data = create_access_token(data={"sub": str(new_user.id)})
    
    response.set_cookie(
        key="access_token",
        value=token_data.encoded_jwt,
        expires=token_data.expire,
        samesite="strict"
    )

    return {
        "access_token": token_data.encoded_jwt,
        "token_type": "bearer",
        "user": UserOut.model_validate(new_user),
        "expires": int(token_data.expire.timestamp())
    }


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
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
    
    # create jwt and set cookie
    token_data = create_access_token(data={"sub": str(user.id)})
    
    response.set_cookie(
        key="access_token",
        value=token_data.encoded_jwt,
        expires=token_data.expire,
        samesite="strict"
    )

    return {
        "access_token": token_data.encoded_jwt,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
        "expires": int(token_data.expire.timestamp())
    }


# ============ Google OAuth Endpoints ============

@router.post("/google", response_model=Token)
def google_auth(google_data: GoogleAuthRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate or register using Google ID token.
    This is the modern client-side OAuth flow.
    Returns JWT token and user info.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )
    
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            google_data.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Extract user info from token
        google_user_id = idinfo.get('sub')
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')  # Google profile picture URL
        
        if not google_user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token: missing required fields",
            )
        
        # Check if user already exists
        user = db.query(User).filter(
            (User.google_id == google_user_id) | (User.email == email)
        ).first()
        
        if user:
            # User exists - link Google account if not already linked
            if not user.google_id:
                user.google_id = google_user_id
                if not user.full_name and name:
                    user.full_name = name
            
            # Update profile picture from Google if:
            # 1. User doesn't have a profile picture, OR
            # 2. User's profile picture is from Google (not a manually uploaded base64 image)
            # This ensures Google OAuth users always get their latest Google profile picture
            # unless they manually uploaded a custom image
            if picture:
                is_manual_upload = user.profile_picture and user.profile_picture.startswith('data:')
                if not is_manual_upload:
                    user.profile_picture = picture
            
            db.commit()
            db.refresh(user)
        else:
            # Create new user with Google profile picture
            user = User(
                email=email,
                google_id=google_user_id,
                full_name=name,
                profile_picture=picture,  # Store Google profile picture,
                stripe_customer_id=create_stripe_customer(email=email).id  # create stripe customer
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create audit log for new user registration via Google
            create_audit_log(
                db=db,
                action_type="user_registered_google",
                target_type="user",
                target_id=user.id,
                actor_id=user.id,
                actor_email=user.email,
                details={
                    "email": user.email,
                    "full_name": user.full_name,
                    "auth_method": "google_oauth",
                },
                ip_address=get_actor_ip(request),
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        # Create JWT token
        token_data = create_access_token(data={"sub": str(user.id)})
        
        response.set_cookie(
            key="access_token",
            value=token_data.encoded_jwt,
            expires=token_data.expire,
            samesite="strict"
        )
        
        return {
            "access_token": token_data.encoded_jwt,
            "token_type": "bearer",
            "user": UserOut.model_validate(user),
            "expires": int(token_data.expire.timestamp())
        }
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )


# redirect user to google to log in (legacy redirect-based flow)
@router.get("/google/login")
async def google_login(request: Request):
    """Legacy redirect-based OAuth flow"""
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


# handle callback and create user in database if necessary (legacy redirect-based flow)
@router.get("/google/callback")
async def google_callback(request: Request, response: Response, db: Session = Depends(get_db)):
    """Legacy redirect-based OAuth callback"""
    token = await oauth.google.authorize_access_token(request)

    userinfo = token.get("userinfo") # possibly included in request
    if not userinfo:
        # otherwise fetch manually
        resp = await oauth.google.get("userinfo", token=token)
        userinfo = resp.json()

    if not userinfo.email or not userinfo.sub or not userinfo.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required user info"
        )
    
    # check if user already has associated account
    user = db.query(User).filter(
        (User.google_id == userinfo.sub) | (User.email == userinfo.email)
    ).first()

    if user:
        # Update or associate Google account
        if not user.google_id:
            user.google_id = userinfo.sub
        
        # Update profile picture from Google if:
        # 1. User doesn't have a profile picture, OR
        # 2. User's profile picture is from Google (not a manually uploaded base64 image)
        # This ensures Google OAuth users always get their latest Google profile picture
        # unless they manually uploaded a custom image
        google_picture = userinfo.get("picture")
        if google_picture:
            is_manual_upload = user.profile_picture and user.profile_picture.startswith('data:')
            if not is_manual_upload:
                user.profile_picture = google_picture
        
        db.commit()
        db.refresh(user)
    else:
        # create new account
        user = User(
            email=userinfo.email,
            google_id=userinfo.sub,
            full_name=userinfo.name,
            profile_picture=userinfo.get("picture"),  # Get Google profile picture
            stripe_customer_id=create_stripe_customer(email=userinfo.email).id  # create stripe customer
        )

        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create audit log for new user registration via Google (legacy flow)
        create_audit_log(
            db=db,
            action_type="user_registered_google",
            target_type="user",
            target_id=user.id,
            actor_id=user.id,
            actor_email=user.email,
            details={
                "email": user.email,
                "full_name": user.full_name,
                "auth_method": "google_oauth_legacy",
            },
            ip_address=get_actor_ip(request),
        )

    # ensure user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    # create jwt and set cookie
    token_cookie(user.id, response)

    # Redirect to frontend with success
    return RedirectResponse(url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/home/dashboard")


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


@router.put("/profile", response_model=UserOut)
def update_profile(
    profile_data: UserProfileUpdate,
    request: Request,
    current_user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.
    Requires valid JWT token in Authorization header.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Store old values for audit log
    old_values = {
        "full_name": user.full_name,
        "phone": user.phone,
        "address": user.address,
        "city": user.city,
        "zipcode": user.zipcode,
        "state": user.state,
    }
    
    # Update only provided fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Create audit log with changed fields (excluding profile_picture for privacy)
    changed_fields = {}
    for field, new_value in update_data.items():
        if field != "profile_picture" and field in old_values and old_values[field] != new_value:
            changed_fields[field] = {"old": old_values[field], "new": new_value}
    
    # Only log if there were actual changes
    if changed_fields or "profile_picture" in update_data:
        details = {"changed_fields": changed_fields}
        if "profile_picture" in update_data:
            details["profile_picture_updated"] = True
        
        create_audit_log(
            db=db,
            action_type="user_profile_updated",
            target_type="user",
            target_id=user.id,
            actor_id=user.id,
            actor_email=user.email,
            details=details,
            ip_address=get_actor_ip(request),
        )
    
    return UserOut.model_validate(user)


@router.put("/password")
def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    Requires valid JWT token and current password verification.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if user has a password (OAuth users might not)
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for OAuth accounts",
        )
    
    # Verify current password
    if not authenticate_user(db, user.email, password_data.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    
    # Update password
    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    # Create audit log for password change (don't log the actual password!)
    create_audit_log(
        db=db,
        action_type="user_password_changed",
        target_type="user",
        target_id=user.id,
        actor_id=user.id,
        actor_email=user.email,
        details={
            "message": "User password was changed successfully"
        },
        ip_address=get_actor_ip(request),
    )
    
    return {"ok": True, "message": "Password changed successfully"}

