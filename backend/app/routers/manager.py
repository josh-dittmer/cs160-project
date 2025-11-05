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
    Change a user's role (managers can only promote customers to employees).
    Manager cannot change their own role.
    When promoting customer to employee: auto-sets reports_to to current manager.
    When demoting employee to customer: clears reports_to.
    Manager or admin only.
    """
    # Prevent manager from changing their own role
    if user_id == manager.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if this role change is allowed
    if not can_modify_user_role(manager.role, user.role, role_update.role):
        if manager.role == "manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only change roles between customer and employee.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot perform this role change",
            )
    
    # Store old role for audit log
    old_role = user.role
    old_reports_to = user.reports_to
    
    # Handle reporting hierarchy
    if role_update.role == "employee" and old_role == "customer":
        # When promoting customer to employee, auto-set reports_to to current manager
        user.reports_to = manager.id
    elif role_update.role == "customer" and old_role == "employee":
        # When demoting employee to customer, clear reports_to
        user.reports_to = None
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    # Get manager's full user object to include name in audit log
    manager_user = db.get(User, manager.id)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="user_role_updated",
        target_type="user",
        target_id=user.id,
        actor_id=manager.id,
        actor_email=manager.email,
        details={
            "old_role": old_role,
            "new_role": role_update.role,
            "old_reports_to": old_reports_to,
            "new_reports_to": user.reports_to,
            "user_email": user.email,
            "changed_by_role": manager.role,
            "changed_by_email": manager.email,
            "changed_by_name": manager_user.full_name if manager_user and manager_user.full_name else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": f"User role updated to {role_update.role}",
    }


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

