from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.employee_service import EmployeeService


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def authenticate_user(db: Session, email: str, password: str):
    user = EmployeeService.get_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password or ""):
        return None
    return user


def create_access_token(data: Dict[str, str], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
