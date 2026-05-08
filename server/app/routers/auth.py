from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.schemas import LoginRequest, Token, CreateStaff, EmployeeResponse, EmployeeCreate, PasswordChangeRequest
from app.services import auth_service, EmployeeService
from app.models import UserRole

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from app.schemas import TokenData

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("email")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    user = EmployeeService.get_by_email(db, token_data.email)
    if user is None:
        raise credentials_exception
    return user


def require_admin(user=Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


@router.post("/login", response_model=Token)
def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = auth_service.create_access_token(
        data={"email": user.email, "role": user.role.value},
        expires_delta=access_token_expires,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=EmployeeResponse)
def me(current_user=Depends(get_current_user)):
    """Return the authenticated employee record."""
    return current_user


@router.post("/create-staff", response_model=EmployeeResponse)
def create_staff(
    payload: CreateStaff,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    # Ensure email not already used
    if EmployeeService.get_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate or use provided initial password
    initial_password = payload.initial_password or "NCBAStaff@123"
    hashed = auth_service.get_password_hash(initial_password)

    # Create employee record
    emp_in = payload.dict()
    # Remove initial_password before creating model
    emp_in.pop("initial_password", None)
    emp_in["hashed_password"] = hashed

    emp_obj = EmployeeCreate(**emp_in)
    emp = EmployeeService.create(db, emp_obj)

    # Note: In production, send password via secure channel (email);
    # here we simply return the created employee (admin should communicate password)
    return emp


@router.post("/change-password")
def change_password(
    password_change: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Allow employee to change their own password."""
    # Verify old password
    if not auth_service.verify_password(password_change.old_password, current_user.hashed_password or ""):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Hash new password
    hashed_new_password = auth_service.get_password_hash(password_change.new_password)
    
    # Update employee password
    current_user.hashed_password = hashed_new_password
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Password changed successfully"}
