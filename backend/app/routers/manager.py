from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import User
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    UserRoleUpdate,
    UserBlockUpdate,
)
from ..auth import require_manager, UserCtx, can_modify_user_role, can_block_user

router = APIRouter(prefix="/api/manager", tags=["manager"])


# ============ User Management Endpoints (Limited) ============

@router.put("/users/{user_id}/role", status_code=status.HTTP_200_OK)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    request: Request,
    manager: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Change a user's role.
    Managers are NOT allowed to change any user roles.
    Admin only.
    """
    # Managers cannot change any user roles (new requirement)
    if manager.role == "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers do not have permission to change user roles",
        )
    
    # This endpoint is now admin-only (but kept in manager router for backward compatibility)
    # All actual logic is handled in the admin router
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Please use the admin endpoint for role changes",
    )


@router.put("/users/{user_id}/block", status_code=status.HTTP_200_OK)
def block_user(
    user_id: int,
    block_update: UserBlockUpdate,
    request: Request,
    manager: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Block or unblock a user (managers can block/unblock customers and employees).
    Manager cannot block themselves.
    Manager or admin only.
    """
    # Prevent manager from blocking themselves
    if user_id == manager.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself",
        )
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if this user can be blocked by the manager
    if not can_block_user(manager.role, user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to block users with role '{user.role}'",
        )
    
    # Store old status for audit log
    old_status = user.is_active
    
    user.is_active = block_update.is_active
    db.commit()
    db.refresh(user)
    
    # Get manager's full user object to include name in audit log
    manager_user = db.get(User, manager.id)
    
    # Create audit log
    action_type = "user_unblocked" if block_update.is_active else "user_blocked"
    create_audit_log(
        db=db,
        action_type=action_type,
        target_type="user",
        target_id=user.id,
        actor_id=manager.id,
        actor_email=manager.email,
        details={
            "old_status": old_status,
            "new_status": block_update.is_active,
            "user_email": user.email,
            "action_by_role": manager.role,
            "action_by_email": manager.email,
            "action_by_name": manager_user.full_name if manager_user and manager_user.full_name else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    action = "unblocked" if block_update.is_active else "blocked"
    return {
        "ok": True,
        "message": f"User {action} successfully",
    }

