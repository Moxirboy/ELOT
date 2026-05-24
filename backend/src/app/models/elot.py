"""ELOT AI domain models.

All ELOT entities live in one module for hackathon iteration speed.
Multi-tenancy is enforced via ``company_id`` on every tenant-scoped row.
"""

from __future__ import annotations

import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import JSON, UUID, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Company(Base):
    __tablename__ = "elot_company"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    name: Mapped[str] = mapped_column(String(120))
    industry: Mapped[str] = mapped_column(String(80), default="General")
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class ElotUser(Base):
    """ELOT-specific app user (admin or learner).

    Kept separate from the boilerplate's ``user`` table so we can demo
    fast without touching the existing auth flow.
    """

    __tablename__ = "elot_user"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String(20), default="learner")  # admin | learner
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class Employee(Base):
    __tablename__ = "elot_employee"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(120), index=True)
    department: Mapped[str] = mapped_column(String(80), default="General")
    job_role: Mapped[str] = mapped_column(String(80), default="Employee")
    risk_level: Mapped[str] = mapped_column(String(20), default="low")  # low | medium | high
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class Policy(Base):
    __tablename__ = "elot_policy"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(20), default="English")
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class Course(Base):
    __tablename__ = "elot_course"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    policy_id: Mapped[int | None] = mapped_column(ForeignKey("elot_policy.id"), index=True, default=None)
    title: Mapped[str] = mapped_column(String(200), default="Untitled Course")
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    language: Mapped[str] = mapped_column(String(20), default="English")
    generated_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class Lesson(Base):
    __tablename__ = "elot_lesson"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    key_takeaway: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)


class QuizQuestion(Base):
    __tablename__ = "elot_quiz_question"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    question: Mapped[str] = mapped_column(Text)
    options_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    correct_answer: Mapped[str] = mapped_column(String(500), default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    topic: Mapped[str] = mapped_column(String(120), default="General")


class Scenario(Base):
    __tablename__ = "elot_scenario"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    situation: Mapped[str] = mapped_column(Text)
    question: Mapped[str] = mapped_column(Text)
    ideal_answer: Mapped[str] = mapped_column(Text, default="")
    risk_level: Mapped[str] = mapped_column(String(20), default="medium")
    policy_reference: Mapped[str] = mapped_column(Text, default="")


class Assignment(Base):
    __tablename__ = "elot_assignment"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class ScenarioAttempt(Base):
    __tablename__ = "elot_scenario_attempt"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("elot_scenario.id"), index=True)
    user_answer: Mapped[str] = mapped_column(Text)
    ai_feedback_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class Certificate(Base):
    __tablename__ = "elot_certificate"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("elot_course.id"), index=True)
    certificate_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
