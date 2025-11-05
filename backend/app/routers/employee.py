from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import User, EmployeeReferral
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    EmployeeReferralCreate,
    EmployeeReferralOut,
)
from ..auth import require_employee, UserCtx

router = APIRouter(prefix="/api/employee", tags=["employee"])


# ============ Employee Referral Endpoints ============

@router.post("/referrals", response_model=EmployeeReferralOut, status_code=status.HTTP_201_CREATED)
def create_referral(
    referral_data: EmployeeReferralCreate,
    request: Request,
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Create a new referral for customer → employee promotion.
    Only employees can create referrals (they go to their manager).
    Employee only.
    """
    # Get the employee's manager
    if not employee.reports_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You don't have a manager assigned. Cannot create referral.",
        )
    
    # Get the referred user
    referred_user = db.get(User, referral_data.referred_user_id)
    if not referred_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referred user not found",
        )
    
    # Can only refer customers to become employees
    if referred_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only refer customers for employee promotion",
        )
    
    # Cannot refer yourself
    if referred_user.id == employee.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot refer yourself",
        )
    
    # Check if there's already a pending referral for this user
    existing_referral = db.execute(
        select(EmployeeReferral).where(
            EmployeeReferral.referred_user_id == referral_data.referred_user_id,
            EmployeeReferral.status == "pending"
        )
    ).scalar_one_or_none()
    
    if existing_referral:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user already has a pending employee referral",
        )
    
    # Create the referral
    referral = EmployeeReferral(
        referred_user_id=referral_data.referred_user_id,
        referring_employee_id=employee.id,
        reviewing_manager_id=employee.reports_to,
        reason=referral_data.reason,
        status="pending",
    )
    
    db.add(referral)
    db.commit()
    db.refresh(referral)
    
    # Get manager and employee objects for response
    manager = db.get(User, employee.reports_to)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="employee_referral_created",
        target_type="employee_referral",
        target_id=referral.id,
        actor_id=employee.id,
        actor_email=employee.email,
        details={
            "referred_user_id": referred_user.id,
            "referred_user_email": referred_user.email,
            "reviewing_manager_id": employee.reports_to,
            "reviewing_manager_email": manager.email if manager else None,
            "reason": referral_data.reason,
        },
        ip_address=get_actor_ip(request),
    )
    
    # Build response
    return EmployeeReferralOut(
        id=referral.id,
        referred_user_id=referred_user.id,
        referred_user_email=referred_user.email,
        referred_user_name=referred_user.full_name,
        referring_employee_id=employee.id,
        referring_employee_email=employee.email,
        reviewing_manager_id=employee.reports_to,
        reviewing_manager_email=manager.email if manager else "Unknown",
        reason=referral.reason,
        status=referral.status,
        manager_notes=referral.manager_notes,
        created_at=referral.created_at,
        reviewed_at=referral.reviewed_at,
    )


@router.get("/referrals", response_model=List[EmployeeReferralOut])
def list_my_referrals(
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    List all referrals created by the current employee.
    Employee only.
    """
    # Get referrals created by this employee
    stmt = (
        select(EmployeeReferral)
        .where(EmployeeReferral.referring_employee_id == employee.id)
        .order_by(EmployeeReferral.created_at.desc())
    )
    
    results = db.execute(stmt).scalars().all()
    
    # Build response
    referrals = []
    for referral in results:
        referred_user = db.get(User, referral.referred_user_id)
        reviewing_manager = db.get(User, referral.reviewing_manager_id)
        
        if referred_user and reviewing_manager:
            referrals.append(EmployeeReferralOut(
                id=referral.id,
                referred_user_id=referred_user.id,
                referred_user_email=referred_user.email,
                referred_user_name=referred_user.full_name,
                referring_employee_id=employee.id,
                referring_employee_email=employee.email,
                reviewing_manager_id=reviewing_manager.id,
                reviewing_manager_email=reviewing_manager.email,
                reason=referral.reason,
                status=referral.status,
                manager_notes=referral.manager_notes,
                created_at=referral.created_at,
                reviewed_at=referral.reviewed_at,
            ))
    
    return referrals


@router.delete("/referrals/{referral_id}", status_code=status.HTTP_200_OK)
def cancel_referral(
    referral_id: int,
    request: Request,
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending referral (only the employee who created it can cancel).
    Employee only.
    """
    referral = db.get(EmployeeReferral, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found",
        )
    
    # Only the referring employee can cancel their own referral
    if referral.referring_employee_id != employee.id:
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
        action_type="employee_referral_cancelled",
        target_type="employee_referral",
        target_id=referral.id,
        actor_id=employee.id,
        actor_email=employee.email,
        details={
            "referred_user_id": referral.referred_user_id,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": "Referral cancelled successfully",
    }

