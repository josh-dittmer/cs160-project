import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import namedtuple

import bcrypt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import Response

from .database import get_db
from .models import User

# ============ Configuration ============

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30

security = HTTPBearer(auto_error=False)


# ============ Password Utilities ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


# ============ JWT Token Utilities ============

AccessTokenData = namedtuple("AccessTokenData", "encoded_jwt expire")

def token_cookie(id: int, response: Response):
    # create jwt
    token_data = create_access_token(data={"sub": str(id)})

    # set cookie
    response.set_cookie(
        key="access_token",
        value=token_data.encoded_jwt,
        expires=token_data.expire,
        samesite="strict"
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> AccessTokenData:
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return AccessTokenData(encoded_jwt, expire)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============ User Authentication ============

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not user.hashed_password:
        return None  # Google-only user
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ============ Dependency Functions ============

class UserCtx(BaseModel):
    id: int
    email: str
    role: str
    stripe_customer_id: str
    reports_to: int | None = None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> UserCtx:
    """
    Dependency to get the current authenticated user from JWT token.
    Extracts token from Authorization: Bearer <token> header.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return UserCtx(
        id=user.id,
        email=user.email,
        role=user.role,
        stripe_customer_id=user.stripe_customer_id,
        reports_to=user.reports_to
    )


def require_user(x_user_id: int | None = Header(default=None, alias="X-User-Id")) -> UserCtx:
    """
    Legacy minimal auth for Sprint 1 testing.
    Pass X-User-Id: <int> header to act as a logged-in user.
    This is kept for backward compatibility with existing tests.
    """
    if x_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return UserCtx(id=int(x_user_id), email="legacy@test.com", role="customer")


# ============ Role-Based Access Control ============

def require_admin(current_user: UserCtx = Depends(get_current_user)) -> UserCtx:
    """
    Dependency to require admin role.
    Raises 403 if user is not an admin.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_role(allowed_roles: list[str]):
    """
    Factory function to create a dependency that checks for specific roles.
    
    Usage:
        @router.get("/endpoint", dependencies=[Depends(require_role(["admin", "manager"]))])
    """
    def role_checker(current_user: UserCtx = Depends(get_current_user)) -> UserCtx:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


def require_manager(current_user: UserCtx = Depends(get_current_user)) -> UserCtx:
    """
    Dependency to require manager or admin role.
    Raises 403 if user is not a manager or admin.
    """
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin access required",
        )
    return current_user


def require_employee(current_user: UserCtx = Depends(get_current_user)) -> UserCtx:
    """
    Dependency to require employee role (or higher).
    Raises 403 if user is not an employee, manager, or admin.
    """
    if current_user.role not in ["employee", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee, manager, or admin access required",
        )
    return current_user


def can_modify_user_role(actor_role: str, target_role: str, new_role: str) -> bool:
    """
    Check if actor can change target user's role.
    
    Rules:
    - Cannot promote to admin
    - Manager can change between customer and employee roles only
    - Admin can change to any role except admin
    
    Args:
        actor_role: Role of the user performing the action
        target_role: Current role of the target user
        new_role: Desired new role for the target user
    
    Returns:
        True if the role change is allowed, False otherwise
    """
    # Cannot promote to admin
    if new_role == "admin":
        return False
    
    # Manager can change between customer and employee (bidirectional)
    if actor_role == "manager":
        return (
            target_role in ["customer", "employee"] and 
            new_role in ["customer", "employee"]
        )
    
    # Admin can change to any role except admin
    if actor_role == "admin":
        return new_role in ["customer", "employee", "manager"]
    
    return False


def can_block_user(actor_role: str, target_role: str) -> bool:
    """
    Check if actor can block target user.
    
    Rules:
    - Manager can block customers and employees
    - Admin can block anyone except themselves (checked elsewhere)
    
    Args:
        actor_role: Role of the user performing the action
        target_role: Role of the target user
    
    Returns:
        True if blocking is allowed, False otherwise
    """
    if actor_role == "manager":
        return target_role in ["customer", "employee"]
    
    if actor_role == "admin":
        return True  # Admin can block anyone (self-blocking prevented in endpoint)
    
    return False
