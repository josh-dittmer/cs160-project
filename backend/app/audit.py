"""
Audit logging utilities for tracking all database modifications.

This module provides functions to create audit log entries for:
- Admin actions (user role changes, inventory management, order status updates)
- User account events (registration, profile updates, password changes)
- Shopping actions (cart operations, order creation)
"""

import json
import logging
from typing import Any, Optional
from sqlalchemy.orm import Session
from .models import AuditLog, User

# Set up logger for audit failures
logger = logging.getLogger(__name__)


def create_audit_log(
    db: Session,
    action_type: str,
    target_type: str,
    target_id: int,
    actor_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Create an audit log entry for a database modification.
    
    This function is designed to be non-blocking - if audit logging fails,
    it will log the error but not raise an exception, ensuring that the
    main operation continues successfully.
    
    Args:
        db: Database session
        action_type: Type of action (e.g., "user_created", "item_updated")
        target_type: Type of entity affected (e.g., "user", "item", "order")
        target_id: ID of the affected entity
        actor_id: ID of the user performing the action (None for system actions)
        actor_email: Email of the actor (for reference, optional)
        details: Additional details as a dict (will be stored as JSON)
        ip_address: IP address of the actor (optional)
    
    Returns:
        The created AuditLog object, or None if creation failed
    """
    try:
        # If actor_id provided but no email, try to fetch it
        if actor_id and not actor_email:
            user = db.get(User, actor_id)
            if user:
                actor_email = user.email
        
        # Convert details dict to JSON string
        details_json = None
        if details:
            try:
                details_json = json.dumps(details, default=str)
            except (TypeError, ValueError) as e:
                logger.warning(f"Failed to serialize audit log details: {e}")
                details_json = json.dumps({"error": "Failed to serialize details"})
        
        # Create audit log entry
        audit_log = AuditLog(
            action_type=action_type,
            actor_id=actor_id,
            actor_email=actor_email,
            target_type=target_type,
            target_id=target_id,
            details=details_json,
            ip_address=ip_address,
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
        
    except Exception as e:
        # Log the error but don't raise - audit logging should never break main operations
        logger.error(f"Failed to create audit log: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def get_actor_ip(request: Any) -> Optional[str]:
    """
    Extract IP address from request object.
    
    Handles both direct connections and proxied requests (X-Forwarded-For header).
    
    Args:
        request: FastAPI Request object
    
    Returns:
        IP address string, or None if not available
    """
    try:
        # Check for X-Forwarded-For header (for proxied requests)
        if hasattr(request, 'headers'):
            forwarded = request.headers.get('X-Forwarded-For')
            if forwarded:
                # X-Forwarded-For can contain multiple IPs, take the first one
                return forwarded.split(',')[0].strip()
        
        # Fall back to direct client IP
        if hasattr(request, 'client') and request.client:
            return request.client.host
        
        return None
    except Exception as e:
        logger.warning(f"Failed to extract IP address: {e}")
        return None

