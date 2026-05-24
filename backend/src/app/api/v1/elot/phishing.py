"""In-app phishing tests + security-awareness dashboard."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    ElotUser,
    Employee,
    GeneratedTraining,
    PhishingTest,
    PhishingTestResult,
    ThreatTrend,
)
from ....schemas.security import (
    PhishingTestAnswer,
    PhishingTestCreate,
    PhishingTestRead,
    PhishingTestResultRead,
    SecurityAwarenessDashboard,
    SecurityDeptStat,
    SecurityEmployeeRisk,
)
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/phishing-tests", tags=["phishing"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["security-dashboard"])


# ---------- Tests ----------
@router.post("", response_model=PhishingTestRead, status_code=status.HTTP_201_CREATED)
async def create_test(
    payload: PhishingTestCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PhishingTestRead:
    scenario = payload.scenario_json
    title = payload.title

    if payload.training_id and not scenario:
        training = (
            await db.execute(
                select(GeneratedTraining).where(
                    GeneratedTraining.id == payload.training_id,
                    GeneratedTraining.company_id == user.company_id,
                )
            )
        ).scalar_one_or_none()
        if not training:
            raise HTTPException(status_code=404, detail="Training not found")
        scenario = training.scenario_json or {}
        if not title:
            title = training.title

    if not scenario:
        raise HTTPException(
            status_code=400,
            detail="Phishing test needs either an inline scenario or a training_id.",
        )

    test = PhishingTest(
        company_id=user.company_id,
        training_id=payload.training_id,
        title=title or "Security challenge",
        test_type=payload.test_type,
        scenario_json=scenario,
        scheduled_at=payload.scheduled_at,
        status="active",
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return PhishingTestRead.model_validate(test)


@router.get("", response_model=list[PhishingTestRead])
async def list_tests(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[PhishingTestRead]:
    rows = (
        await db.execute(
            select(PhishingTest)
            .where(PhishingTest.company_id == user.company_id)
            .order_by(PhishingTest.id.desc())
        )
    ).scalars().all()
    return [PhishingTestRead.model_validate(t) for t in rows]


@router.get("/{test_id}", response_model=PhishingTestRead)
async def get_test(
    test_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PhishingTestRead:
    t = (
        await db.execute(
            select(PhishingTest).where(
                PhishingTest.id == test_id,
                PhishingTest.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    return PhishingTestRead.model_validate(t)


@router.get("/{test_id}/results", response_model=list[PhishingTestResultRead])
async def get_test_results(
    test_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[PhishingTestResultRead]:
    rows = (
        await db.execute(
            select(PhishingTestResult, Employee)
            .join(Employee, Employee.id == PhishingTestResult.employee_id)
            .where(PhishingTestResult.test_id == test_id)
            .order_by(PhishingTestResult.created_at.desc())
        )
    ).all()
    out: list[PhishingTestResultRead] = []
    for r, emp in rows:
        out.append(
            PhishingTestResultRead(
                id=r.id,
                test_id=r.test_id,
                employee_id=r.employee_id,
                action=r.action,
                answer=r.answer,
                score=r.score,
                risk_level=r.risk_level,
                feedback_json=r.feedback_json,
                created_at=r.created_at,
                employee_name=emp.name,
            )
        )
    return out


@router.post("/{test_id}/submit-answer", response_model=PhishingTestResultRead)
async def submit_answer(
    test_id: int,
    payload: PhishingTestAnswer,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PhishingTestResultRead:
    test = (
        await db.execute(
            select(PhishingTest).where(
                PhishingTest.id == test_id,
                PhishingTest.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    employee = (
        await db.execute(
            select(Employee).where(
                Employee.id == payload.employee_id,
                Employee.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    scenario = test.scenario_json or {}
    correct = (scenario.get("correctAnswer") or scenario.get("correct_answer") or "").strip()
    explanation = scenario.get("explanation", "")
    risky_actions = {
        opt
        for opt in scenario.get("options", [])
        if opt and opt != correct
    }
    is_correct = bool(correct) and payload.answer.strip() == correct
    if payload.action:
        action = payload.action
    elif is_correct:
        action = "answered_correctly"
    elif payload.answer in risky_actions:
        action = "answered_risky"
    else:
        action = "opened"

    score = 100 if is_correct else (40 if action == "answered_risky" else 0)
    risk = "low" if is_correct else "high" if action == "answered_risky" else "medium"

    feedback = {
        "isCorrect": is_correct,
        "correctAnswer": correct,
        "explanation": explanation,
        "elapsed_ms": payload.elapsed_ms,
    }

    result = PhishingTestResult(
        test_id=test.id,
        employee_id=employee.id,
        action=action,
        answer=payload.answer,
        score=score,
        risk_level=risk,
        feedback_json=feedback,
    )
    db.add(result)

    # Roll up to the employee's risk_level — last result wins for simplicity
    employee.risk_level = risk
    await db.commit()
    await db.refresh(result)

    return PhishingTestResultRead(
        id=result.id,
        test_id=result.test_id,
        employee_id=result.employee_id,
        action=result.action,
        answer=result.answer,
        score=result.score,
        risk_level=result.risk_level,
        feedback_json=result.feedback_json,
        created_at=result.created_at,
        employee_name=employee.name,
    )


# ---------- Security awareness dashboard ----------
@dashboard_router.get("/security-awareness", response_model=SecurityAwarenessDashboard)
async def security_awareness(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> SecurityAwarenessDashboard:
    employees = (
        await db.execute(select(Employee).where(Employee.company_id == user.company_id))
    ).scalars().all()
    emp_by_id = {e.id: e for e in employees}

    tests = (
        await db.execute(
            select(PhishingTest).where(PhishingTest.company_id == user.company_id)
        )
    ).scalars().all()
    test_ids = [t.id for t in tests]
    results = (
        await db.execute(
            select(PhishingTestResult).where(
                PhishingTestResult.test_id.in_(test_ids or [-1])
            )
        )
    ).scalars().all()
    trainings = (
        await db.execute(
            select(GeneratedTraining).where(GeneratedTraining.company_id == user.company_id)
        )
    ).scalars().all()
    trends = (await db.execute(select(ThreatTrend))).scalars().all()

    correct = sum(1 for r in results if r.action == "answered_correctly")
    risky = sum(1 for r in results if r.action == "answered_risky")
    answered = correct + risky
    correct_rate = (correct / answered) if answered else 0.0
    avg_score = (sum(r.score for r in results) / len(results)) if results else 0.0

    # Departments
    by_dept: dict[str, dict] = defaultdict(
        lambda: {"correct": 0, "risky": 0, "scores": [], "high_risk": 0}
    )
    for emp in employees:
        if emp.risk_level == "high":
            by_dept[emp.department]["high_risk"] += 1
    for r in results:
        emp = emp_by_id.get(r.employee_id)
        if not emp:
            continue
        bucket = by_dept[emp.department]
        if r.action == "answered_correctly":
            bucket["correct"] += 1
        elif r.action == "answered_risky":
            bucket["risky"] += 1
        bucket["scores"].append(r.score)
    department_stats = [
        SecurityDeptStat(
            department=d,
            correct=b["correct"],
            risky=b["risky"],
            average_score=(sum(b["scores"]) / len(b["scores"])) if b["scores"] else 0.0,
            high_risk_employees=b["high_risk"],
        )
        for d, b in by_dept.items()
    ]

    # Riskiest employees
    per_emp: dict[int, dict] = defaultdict(
        lambda: {"correct": 0, "risky": 0, "scores": []}
    )
    for r in results:
        b = per_emp[r.employee_id]
        if r.action == "answered_correctly":
            b["correct"] += 1
        elif r.action == "answered_risky":
            b["risky"] += 1
        b["scores"].append(r.score)
    riskiest = sorted(
        (
            SecurityEmployeeRisk(
                employee_id=eid,
                name=emp_by_id[eid].name,
                department=emp_by_id[eid].department,
                risk_level=emp_by_id[eid].risk_level,  # type: ignore[arg-type]
                risky_actions=b["risky"],
                correct_actions=b["correct"],
                average_score=(sum(b["scores"]) / len(b["scores"])) if b["scores"] else 0.0,
            )
            for eid, b in per_emp.items()
            if eid in emp_by_id
        ),
        key=lambda e: (-e.risky_actions, e.average_score),
    )[:8]

    # Weak methods: methods with the most risky answers, joined via test→training→trend
    weak_methods: dict[str, dict[str, int]] = defaultdict(
        lambda: {"risky": 0, "correct": 0}
    )
    training_by_id = {t.id: t for t in trainings}
    trend_by_id = {t.id: t for t in trends}
    test_by_id = {t.id: t for t in tests}
    for r in results:
        test = test_by_id.get(r.test_id)
        if not test or not test.training_id:
            continue
        training = training_by_id.get(test.training_id)
        if not training:
            continue
        trend = trend_by_id.get(training.trend_id)
        if not trend:
            continue
        bucket = weak_methods[trend.method]
        if r.action == "answered_correctly":
            bucket["correct"] += 1
        elif r.action == "answered_risky":
            bucket["risky"] += 1
    weak_methods_out = [
        {"method": m, "risky": b["risky"], "correct": b["correct"]}
        for m, b in sorted(weak_methods.items(), key=lambda kv: -kv[1]["risky"])
    ][:5]

    active_trends = len(trends)
    drafts = sum(1 for t in trainings if t.status == "draft")
    published = sum(1 for t in trainings if t.status == "published")

    return SecurityAwarenessDashboard(
        active_trends=active_trends,
        drafts=drafts,
        published_trainings=published,
        tests_run=len(tests),
        correct_rate=round(correct_rate, 4),
        average_response_score=round(avg_score, 1),
        department_stats=department_stats,
        riskiest_employees=riskiest,
        weak_methods=weak_methods_out,
    )
