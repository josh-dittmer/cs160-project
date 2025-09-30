from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel


class UserCtx(BaseModel):
    id: int


def require_user(x_user_id: int | None = Header(default=None, alias="X-User-Id")) -> UserCtx:
    """
    Minimal auth for Sprint 1 testing.
    Pass X-User-Id: <int> header to act as a logged-in user.
    Replace with real JWT verification later.
    """
    if x_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    return UserCtx(id=int(x_user_id))
