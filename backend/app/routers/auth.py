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
from ..schemas import UserCreate, UserLogin, UserOut, Token, GoogleAuthRequest
from ..auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    token_cookie,
    UserCtx,
)

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
def signup(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
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
        "user": UserOut.model_validate(new_user)
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
        "user": UserOut.model_validate(user)
    }


# ============ Google OAuth Endpoints ============

@router.post("/google", response_model=Token)
def google_auth(google_data: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
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
                db.commit()
                db.refresh(user)
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_user_id,
                full_name=name,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
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
            "user": UserOut.model_validate(user)
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
        # user signed up with email first, associate their google account
        if not user.google_id:
            user.google_id = userinfo.sub
            db.commit()
            db.refresh(user)
    else:
        # create new account
        user = User(
            email=userinfo.email,
            google_id=userinfo.sub,
            full_name=userinfo.name
        )

        db.add(user)
        db.commit()
        db.refresh(user)

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

