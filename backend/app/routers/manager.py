from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import User, PromotionReferral
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    UserRoleUpdate,
    UserBlockUpdate,
    ReferralCreate,
    ReferralOut,
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
                detail="Managers can only change roles between customer and employee. To promote to manager, create a referral.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot perform this role change",
            )
    
    # Store old role for audit log
    old_role = user.role
    
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


# ============ Promotion Referral Endpoints ============

@router.post("/referrals", response_model=ReferralOut, status_code=status.HTTP_201_CREATED)
def create_referral(
    referral_data: ReferralCreate,
    request: Request,
    manager: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Create a new promotion referral for employee → manager promotion.
    Only managers can create referrals (admins promote directly).
    Manager or admin only.
    """
    # Only managers need to create referrals (admins promote directly)
    if manager.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins can promote users directly without creating referrals",
        )
    
    # Get the referred user
    referred_user = db.get(User, referral_data.referred_user_id)
    if not referred_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referred user not found",
        )
    
    # Can only refer employees to become managers
    if referred_user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only refer employees for manager promotion",
        )
    
    # Cannot refer yourself
    if referred_user.id == manager.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot refer yourself",
        )
    
    # Check if there's already a pending referral for this user
    existing_referral = db.execute(
        select(PromotionReferral).where(
            PromotionReferral.referred_user_id == referral_data.referred_user_id,
            PromotionReferral.status == "pending"
        )
    ).scalar_one_or_none()
    
    if existing_referral:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user already has a pending referral",
        )
    
    # Create the referral
    referral = PromotionReferral(
        referred_user_id=referral_data.referred_user_id,
        referring_manager_id=manager.id,
        target_role="manager",
        reason=referral_data.reason,
        status="pending",
    )
    
    db.add(referral)
    db.commit()
    db.refresh(referral)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="referral_created",
        target_type="referral",
        target_id=referral.id,
        actor_id=manager.id,
        actor_email=manager.email,
        details={
            "referred_user_id": referred_user.id,
            "referred_user_email": referred_user.email,
            "target_role": "manager",
            "reason": referral_data.reason,
        },
        ip_address=get_actor_ip(request),
    )
    
    # Build response
    return ReferralOut(
        id=referral.id,
        referred_user_id=referred_user.id,
        referred_user_email=referred_user.email,
        referred_user_name=referred_user.full_name,
        referring_manager_id=manager.id,
        referring_manager_email=manager.email,
        target_role=referral.target_role,
        reason=referral.reason,
        status=referral.status,
        admin_notes=referral.admin_notes,
        created_at=referral.created_at,
        reviewed_at=referral.reviewed_at,
    )


@router.get("/referrals", response_model=List[ReferralOut])
def list_my_referrals(
    manager: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    List all referrals created by the current manager.
    Manager or admin only.
    """
    # Get referrals created by this manager
    stmt = (
        select(PromotionReferral, User)
        .join(User, PromotionReferral.referred_user_id == User.id)
        .where(PromotionReferral.referring_manager_id == manager.id)
        .order_by(PromotionReferral.created_at.desc())
    )
    
    results = db.execute(stmt).all()
    
    # Build response
    referrals = []
    for referral, referred_user in results:
        referrals.append(ReferralOut(
            id=referral.id,
            referred_user_id=referred_user.id,
            referred_user_email=referred_user.email,
            referred_user_name=referred_user.full_name,
            referring_manager_id=manager.id,
            referring_manager_email=manager.email,
            target_role=referral.target_role,
            reason=referral.reason,
            status=referral.status,
            admin_notes=referral.admin_notes,
            created_at=referral.created_at,
            reviewed_at=referral.reviewed_at,
        ))
    
    return referrals


@router.delete("/referrals/{referral_id}", status_code=status.HTTP_200_OK)
def cancel_referral(
    referral_id: int,
    request: Request,
    manager: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending referral (only the manager who created it can cancel).
    Manager or admin only.
    """
    referral = db.get(PromotionReferral, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found",
        )
    
    # Only the referring manager can cancel their own referral
    if referral.referring_manager_id != manager.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own referrals",
        )
    
    # Can only cancel pending referrals
    if referral.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel referral with status '{referral.status}'",
        )
    
    # Update status to cancelled
    referral.status = "cancelled"
    db.commit()
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="referral_cancelled",
        target_type="referral",
        target_id=referral.id,
        actor_id=manager.id,
        actor_email=manager.email,
        details={
            "referred_user_id": referral.referred_user_id,
            "target_role": referral.target_role,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": "Referral cancelled successfully",
    }

