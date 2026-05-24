"""Onboarding OS — templates, instances, tasks, reviews, feedback, dashboards.

One file to keep the surface easy to grep; subdivide later if it grows. Auth
model: tenant-scoped admin (HR) controls writes; employees can act on tasks
assigned to *their* employee record only. Role columns on each authored row
preserve the audit trail (who acted in what capacity) even when an
ElotUser's role later changes.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    ElotUser,
    Employee,
    OnbAIRecommendation,
    OnbBuddyCheckIn,
    OnbEmployeeFeedback,
    OnbHelpRequest,
    OnbInstance,
    OnbNotification,
    OnbReview,
    OnbTask,
    OnbTaskFeedback,
    OnbTaskSubmission,
    OnbTemplate,
    OnbTemplateTask,
)
from ....schemas.onboarding_os import (
    AIRecommendationRead,
    AssignManagerRequest,
    BuddyCheckInCreate,
    BuddyCheckInRead,
    EmployeeFeedbackCreate,
    EmployeeFeedbackRead,
    EmployeeTimeline,
    FinalReport,
    GenericMessage,
    BuddyDashboard,
    HRDashboard,
    HelpRequestCreate,
    HelpRequestRead,
    HelpRequestRespond,
    ITDashboard,
    ITSetupForEmployee,
    ITSetupItem,
    ITTaskBlock,
    ITTaskComplete,
    ITTaskStatusUpdate,
    InstanceCard,
    InstanceCreate,
    InstanceRead,
    InstanceUpdate,
    ManagerDashboard,
    MentorAnswer,
    MentorQuestion,
    NotificationRead,
    ReviewCreate,
    ReviewRead,
    SupervisorDashboard,
    TaskCreate,
    TaskFeedbackCreate,
    TaskFeedbackRead,
    TaskRead,
    TaskSubmissionCreate,
    TaskSubmissionRead,
    TaskUpdate,
    TemplateAIGenerateRequest,
    TemplateCreate,
    TemplateDetail,
    TemplateRead,
    TemplateTaskCreate,
    TemplateTaskRead,
    TemplateUpdate,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/onboarding-os", tags=["onboarding-os"])


# ---------------------------------------------------------------------------
# Stage utilities
# ---------------------------------------------------------------------------
STAGE_ORDER = [
    "preboarding",
    "day_1",
    "week_1",
    "day_30",
    "day_60",
    "day_90",
    "extended",
]
STAGE_DAY = {
    "preboarding": -3,
    "day_1": 1,
    "week_1": 7,
    "day_30": 30,
    "day_60": 60,
    "day_90": 90,
    "extended": 120,
}


def _current_stage(start_date: datetime) -> str:
    if not start_date:
        return "day_1"
    days = (datetime.now(UTC) - start_date.astimezone(UTC)).days
    chosen = "preboarding"
    for stage in STAGE_ORDER:
        if days >= STAGE_DAY[stage]:
            chosen = stage
    return chosen


async def _employee_name(db: AsyncSession, emp_id: int | None) -> str | None:
    if not emp_id:
        return None
    row = (await db.execute(select(Employee).where(Employee.id == emp_id))).scalar_one_or_none()
    return row.name if row else None


async def _user_name(db: AsyncSession, user_id: int | None) -> str | None:
    if not user_id:
        return None
    row = (await db.execute(select(ElotUser).where(ElotUser.id == user_id))).scalar_one_or_none()
    return row.full_name if row else None


async def _notify(
    db: AsyncSession,
    *,
    company_id: int,
    title: str,
    message: str,
    type_: str,
    target_url: str = "",
    user_id: int | None = None,
    employee_id: int | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    db.add(
        OnbNotification(
            company_id=company_id,
            user_id=user_id,
            employee_id=employee_id,
            title=title,
            message=message,
            type=type_,
            target_url=target_url,
            payload_json=payload,
        )
    )


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
@router.post("/templates", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TemplateRead:
    tpl = OnbTemplate(
        company_id=user.company_id,
        name=payload.name,
        role_name=payload.role_name,
        department=payload.department,
        duration_days=payload.duration_days,
        description=payload.description,
        success_criteria=payload.success_criteria,
        required_score=payload.required_score,
        final_approval_required=payload.final_approval_required,
        created_by_user_id=user.id,
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    for t in payload.tasks:
        db.add(
            OnbTemplateTask(
                template_id=tpl.id,
                title=t.title,
                description=t.description,
                stage=t.stage,
                category=t.category,
                default_due_day=t.default_due_day,
                default_owner_role=t.default_owner_role,
                default_reviewer_role=t.default_reviewer_role,
                approval_required=t.approval_required,
                feedback_required=t.feedback_required,
                required_score=t.required_score,
                priority=t.priority,
                resources_json=t.resources,
                quiz_json=t.quiz,
                order_index=t.order_index,
            )
        )
    await db.commit()
    return TemplateRead.model_validate(tpl)


@router.get("/templates", response_model=list[TemplateRead])
async def list_templates(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TemplateRead]:
    rows = (
        await db.execute(
            select(OnbTemplate)
            .where(OnbTemplate.company_id == user.company_id)
            .order_by(OnbTemplate.id.desc())
        )
    ).scalars().all()
    return [TemplateRead.model_validate(r) for r in rows]


@router.get("/templates/{template_id}", response_model=TemplateDetail)
async def get_template(
    template_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TemplateDetail:
    tpl = (
        await db.execute(
            select(OnbTemplate).where(
                OnbTemplate.id == template_id,
                OnbTemplate.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    tasks = (
        await db.execute(
            select(OnbTemplateTask)
            .where(OnbTemplateTask.template_id == tpl.id)
            .order_by(OnbTemplateTask.order_index, OnbTemplateTask.id)
        )
    ).scalars().all()
    base = TemplateRead.model_validate(tpl)
    return TemplateDetail(
        **base.model_dump(),
        tasks=[TemplateTaskRead.model_validate(t) for t in tasks],
    )


@router.patch("/templates/{template_id}", response_model=TemplateRead)
async def update_template(
    template_id: int,
    payload: TemplateUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TemplateRead:
    tpl = (
        await db.execute(
            select(OnbTemplate).where(
                OnbTemplate.id == template_id,
                OnbTemplate.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(tpl, k, v)
    tpl.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(tpl)
    return TemplateRead.model_validate(tpl)


@router.delete("/templates/{template_id}", response_model=GenericMessage)
async def delete_template(
    template_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    tpl = (
        await db.execute(
            select(OnbTemplate).where(
                OnbTemplate.id == template_id,
                OnbTemplate.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    # Cascade-delete template tasks (no live instances depend on them)
    await db.execute(
        select(OnbTemplateTask).where(OnbTemplateTask.template_id == tpl.id)
    )
    for tt in (
        await db.execute(
            select(OnbTemplateTask).where(OnbTemplateTask.template_id == tpl.id)
        )
    ).scalars():
        await db.delete(tt)
    await db.delete(tpl)
    await db.commit()
    return GenericMessage(message="Template deleted")


@router.post("/templates/generate-ai", response_model=TemplateDetail)
async def generate_template_with_ai(
    payload: TemplateAIGenerateRequest,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TemplateDetail:
    plan = await ai_service.os_generate_plan(
        role_name=payload.role_name,
        description=payload.description,
        department=payload.department,
        company_context=payload.company_context,
    )
    tpl = OnbTemplate(
        company_id=user.company_id,
        name=plan.get("name") or f"{payload.role_name} Onboarding",
        role_name=payload.role_name,
        department=payload.department,
        duration_days=payload.duration_days,
        description=plan.get("description", ""),
        success_criteria=plan.get("success_criteria", ""),
        required_score=payload.required_score,
        final_approval_required=bool(plan.get("final_approval_required", True)),
        created_by_user_id=user.id,
        ai_generated=True,
        metadata_json={"ai_source_description": payload.description[:500]},
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    for t in plan.get("tasks", []):
        db.add(
            OnbTemplateTask(
                template_id=tpl.id,
                title=t.get("title", "Untitled"),
                description=t.get("description", ""),
                stage=t.get("stage", "day_1"),
                category=t.get("category", "role_training"),
                default_due_day=int(t.get("default_due_day", 1)),
                default_owner_role=t.get("default_owner_role", "employee"),
                default_reviewer_role=t.get("default_reviewer_role", "hr"),
                approval_required=bool(t.get("approval_required", False)),
                feedback_required=bool(t.get("feedback_required", False)),
                required_score=t.get("required_score"),
                priority=t.get("priority", "medium"),
                resources_json=t.get("resources", []) or [],
                quiz_json=t.get("quiz"),
                order_index=int(t.get("order_index", 0)),
            )
        )
    await db.commit()
    return await get_template(tpl.id, user, db)


# ---------------------------------------------------------------------------
# Instances
# ---------------------------------------------------------------------------
async def _ensure_employee(db: AsyncSession, company_id: int, employee_id: int) -> Employee:
    emp = (
        await db.execute(
            select(Employee).where(Employee.id == employee_id, Employee.company_id == company_id)
        )
    ).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


async def _materialise_tasks(
    db: AsyncSession,
    instance: OnbInstance,
    template: OnbTemplate | None,
    user_id: int,
) -> int:
    """Clone the template's tasks onto a live instance."""
    if not template:
        return 0
    tt_rows = (
        await db.execute(
            select(OnbTemplateTask)
            .where(OnbTemplateTask.template_id == template.id)
            .order_by(OnbTemplateTask.order_index, OnbTemplateTask.id)
        )
    ).scalars().all()
    start = instance.start_date or datetime.now(UTC)
    reviewer_lookup = {
        "hr": None,  # HR is the admin user; reviewer_employee_id remains null
        "manager": instance.manager_id,
        "supervisor": instance.supervisor_id,
        "buddy": instance.buddy_id,
        "it": instance.it_owner_id,
        "employee": instance.employee_id,
    }
    history_seed = [
        {
            "actor_user_id": user_id,
            "actor_role": "hr",
            "action": "created_from_template",
            "at": datetime.now(UTC).isoformat(),
        }
    ]
    n = 0
    for tt in tt_rows:
        due = start + timedelta(days=tt.default_due_day)
        reviewer_eid = reviewer_lookup.get(tt.default_reviewer_role)
        db.add(
            OnbTask(
                instance_id=instance.id,
                template_task_id=tt.id,
                title=tt.title,
                description=tt.description,
                stage=tt.stage,
                category=tt.category,
                assigned_by_user_id=user_id,
                assigned_by_role=tt.default_reviewer_role or "hr",
                assigned_to_employee_id=instance.employee_id,
                reviewer_employee_id=reviewer_eid,
                reviewer_role=tt.default_reviewer_role,
                due_date=due,
                priority=tt.priority,
                approval_required=tt.approval_required,
                feedback_required=tt.feedback_required,
                required_score=tt.required_score,
                resources_json=tt.resources_json or [],
                quiz_json=tt.quiz_json,
                assignment_history_json=list(history_seed),
            )
        )
        n += 1
    return n


@router.post("/instances", response_model=InstanceRead, status_code=status.HTTP_201_CREATED)
async def create_instance(
    payload: InstanceCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InstanceRead:
    employee = await _ensure_employee(db, user.company_id, payload.employee_id)

    template: OnbTemplate | None = None
    if payload.template_id:
        template = (
            await db.execute(
                select(OnbTemplate).where(
                    OnbTemplate.id == payload.template_id,
                    OnbTemplate.company_id == user.company_id,
                )
            )
        ).scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

    start = payload.start_date or datetime.now(UTC)
    duration = payload.duration_days or (template.duration_days if template else 90)
    instance = OnbInstance(
        company_id=user.company_id,
        employee_id=employee.id,
        template_id=template.id if template else None,
        role_name=payload.role_name or (template.role_name if template else employee.job_role),
        department=payload.department or employee.department,
        start_date=start,
        end_date=start + timedelta(days=duration),
        duration_days=duration,
        manager_id=payload.manager_id,
        supervisor_id=payload.supervisor_id,
        buddy_id=payload.buddy_id,
        it_owner_id=payload.it_owner_id,
        success_criteria=payload.success_criteria or (template.success_criteria if template else ""),
    )
    db.add(instance)
    await db.commit()
    await db.refresh(instance)

    created = await _materialise_tasks(db, instance, template, user.id)
    await db.commit()

    # Notify chain
    for role_label, eid in (
        ("manager", payload.manager_id),
        ("supervisor", payload.supervisor_id),
        ("buddy", payload.buddy_id),
    ):
        if eid:
            await _notify(
                db,
                company_id=user.company_id,
                employee_id=eid,
                title=f"You are now {role_label} for {employee.name}",
                message=f"{employee.name} starts onboarding on {start.date().isoformat()}.",
                type_="task_assigned",
                target_url=f"/admin/onboarding-os/instances/{instance.id}",
            )
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=employee.id,
        title="Welcome — your onboarding plan is ready",
        message=f"{created} task(s) have been added to your timeline.",
        type_="task_assigned",
        target_url="/learner/onboarding-os/timeline",
    )
    await db.commit()
    return InstanceRead.model_validate(instance)


async def _instance_card(db: AsyncSession, instance: OnbInstance) -> InstanceCard:
    tasks = (
        await db.execute(select(OnbTask).where(OnbTask.instance_id == instance.id))
    ).scalars().all()
    now = datetime.now(UTC)
    overdue = sum(
        1
        for t in tasks
        if t.due_date and t.due_date < now and t.status not in {"completed", "approved"}
    )
    open_count = sum(1 for t in tasks if t.status not in {"completed", "approved"})
    pending = sum(1 for t in tasks if t.status == "submitted")
    base = InstanceRead.model_validate(instance)
    return InstanceCard(
        **base.model_dump(),
        employee_name=await _employee_name(db, instance.employee_id),
        manager_name=await _employee_name(db, instance.manager_id),
        supervisor_name=await _employee_name(db, instance.supervisor_id),
        buddy_name=await _employee_name(db, instance.buddy_id),
        open_tasks=open_count,
        overdue_tasks=overdue,
        pending_reviews=pending,
        current_stage=_current_stage(instance.start_date),
    )


@router.get("/instances", response_model=list[InstanceCard])
async def list_instances(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[InstanceCard]:
    rows = (
        await db.execute(
            select(OnbInstance)
            .where(OnbInstance.company_id == user.company_id)
            .order_by(OnbInstance.id.desc())
        )
    ).scalars().all()
    out: list[InstanceCard] = []
    for inst in rows:
        out.append(await _instance_card(db, inst))
    return out


async def _refresh_progress(db: AsyncSession, instance: OnbInstance) -> None:
    """Recompute overall_progress + readiness_score + risk_level from tasks."""
    tasks = (
        await db.execute(select(OnbTask).where(OnbTask.instance_id == instance.id))
    ).scalars().all()
    if not tasks:
        instance.overall_progress = 0
        instance.readiness_score = 0
        instance.risk_level = "low"
        return
    done = sum(1 for t in tasks if t.status in {"approved", "completed"})
    instance.overall_progress = int((done / len(tasks)) * 100)
    scores = [t.score for t in tasks if isinstance(t.score, int)]
    if scores:
        instance.readiness_score = int(sum(scores) / len(scores))
    now = datetime.now(UTC)
    overdue = sum(
        1
        for t in tasks
        if t.due_date and t.due_date < now and t.status not in {"approved", "completed"}
    )
    failed = sum(1 for t in tasks if t.status == "failed")
    if failed >= 2 or overdue >= 3:
        instance.risk_level = "high"
    elif failed >= 1 or overdue >= 1:
        instance.risk_level = "medium"
    else:
        instance.risk_level = "low"
    instance.updated_at = now


@router.get("/instances/{instance_id}", response_model=InstanceCard)
async def get_instance(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InstanceCard:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    return await _instance_card(db, inst)


@router.patch("/instances/{instance_id}", response_model=InstanceRead)
async def update_instance(
    instance_id: int,
    payload: InstanceUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InstanceRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(inst, k, v)
    inst.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(inst)
    return InstanceRead.model_validate(inst)


@router.post("/instances/{instance_id}/assign", response_model=InstanceRead)
async def assign_chain(
    instance_id: int,
    payload: AssignManagerRequest,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InstanceRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    changed = {}
    for k, v in payload.model_dump(exclude_unset=True).items():
        old = getattr(inst, k)
        if old != v:
            changed[k] = (old, v)
            setattr(inst, k, v)
    inst.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(inst)
    if changed:
        for k, (_old, new) in changed.items():
            if new:
                await _notify(
                    db,
                    company_id=user.company_id,
                    employee_id=new,
                    title=f"Assigned as {k.replace('_', ' ')}",
                    message=f"You are now the {k.replace('_id', '').replace('_', ' ')} for instance #{inst.id}.",
                    type_="task_assigned",
                    target_url=f"/admin/onboarding-os/instances/{inst.id}",
                )
        await db.commit()
    return InstanceRead.model_validate(inst)


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
async def _task_read(db: AsyncSession, t: OnbTask) -> TaskRead:
    base = TaskRead.model_validate(t)
    base.assigned_by_name = await _user_name(db, t.assigned_by_user_id)
    base.assigned_to_name = await _employee_name(db, t.assigned_to_employee_id)
    base.reviewer_name = await _employee_name(db, t.reviewer_employee_id)
    return base


@router.get("/instances/{instance_id}/tasks", response_model=list[TaskRead])
async def list_instance_tasks(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TaskRead]:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    rows = (
        await db.execute(
            select(OnbTask)
            .where(OnbTask.instance_id == instance_id)
            .order_by(OnbTask.due_date.asc().nullslast(), OnbTask.id)
        )
    ).scalars().all()
    out: list[TaskRead] = []
    for t in rows:
        out.append(await _task_read(db, t))
    return out


@router.post(
    "/instances/{instance_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    instance_id: int,
    payload: TaskCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    history = [
        {
            "actor_user_id": user.id,
            "actor_role": payload.assigned_by_role,
            "action": "created",
            "at": datetime.now(UTC).isoformat(),
        }
    ]
    t = OnbTask(
        instance_id=instance_id,
        title=payload.title,
        description=payload.description,
        stage=payload.stage,
        category=payload.category,
        assigned_by_user_id=user.id,
        assigned_by_role=payload.assigned_by_role,
        assigned_to_employee_id=payload.assigned_to_employee_id,
        reviewer_employee_id=payload.reviewer_employee_id,
        reviewer_role=payload.reviewer_role,
        due_date=payload.due_date,
        priority=payload.priority,
        approval_required=payload.approval_required,
        feedback_required=payload.feedback_required,
        required_score=payload.required_score,
        resources_json=payload.resources,
        quiz_json=payload.quiz,
        assignment_history_json=history,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=t.assigned_to_employee_id,
        title=f"New task: {t.title}",
        message=f"Assigned by {payload.assigned_by_role.upper()}; due {t.due_date.date().isoformat() if t.due_date else 'no deadline'}.",
        type_="task_assigned",
        target_url=f"/learner/onboarding-os/tasks/{t.id}",
    )
    await db.commit()
    return await _task_read(db, t)


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return await _task_read(db, t)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    history = list(t.assignment_history_json or [])
    for k, v in payload.model_dump(exclude_unset=True).items():
        old = getattr(t, k)
        if old != v:
            history.append(
                {
                    "actor_user_id": user.id,
                    "actor_role": "hr",
                    "action": f"updated_{k}",
                    "from": str(old),
                    "to": str(v),
                    "at": datetime.now(UTC).isoformat(),
                }
            )
            setattr(t, k, v)
    t.assignment_history_json = history
    t.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(t)
    return await _task_read(db, t)


@router.post("/tasks/{task_id}/submit", response_model=TaskSubmissionRead)
async def submit_task(
    task_id: int,
    payload: TaskSubmissionCreate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskSubmissionRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Auto-score quiz if present
    auto_score: int | None = None
    if t.quiz_json and payload.quiz_answers:
        correct = 0
        total = 0
        for q in t.quiz_json:
            total += 1
            qid = str(q.get("id") or q.get("question") or total)
            if payload.quiz_answers.get(qid) == q.get("correctAnswer"):
                correct += 1
        auto_score = int((correct / total) * 100) if total else None

    sub = OnbTaskSubmission(
        task_id=t.id,
        employee_id=t.assigned_to_employee_id,
        submission_text=payload.submission_text,
        attachment_url=payload.attachment_url,
        quiz_answers_json=payload.quiz_answers,
        auto_score=auto_score,
    )
    db.add(sub)
    if t.approval_required:
        t.status = "submitted"
    else:
        t.status = "completed"
        t.completed_at = datetime.now(UTC)
        if auto_score is not None:
            t.score = auto_score
    t.submitted_at = datetime.now(UTC)
    t.assignment_history_json = list(t.assignment_history_json or []) + [
        {
            "actor_user_id": user.id,
            "actor_role": "employee",
            "action": "submitted",
            "at": datetime.now(UTC).isoformat(),
        }
    ]
    if t.reviewer_employee_id and t.approval_required:
        await _notify(
            db,
            company_id=user.company_id,
            employee_id=t.reviewer_employee_id,
            title=f"Task submitted: {t.title}",
            message=f"Awaiting your review.",
            type_="task_submitted",
            target_url=f"/admin/onboarding-os/tasks/{t.id}",
        )
    await _refresh_progress(db, inst)
    await db.commit()
    await db.refresh(sub)
    return TaskSubmissionRead.model_validate(sub)


@router.post("/tasks/{task_id}/review", response_model=TaskFeedbackRead)
async def review_task(
    task_id: int,
    payload: TaskFeedbackCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskFeedbackRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    fb = OnbTaskFeedback(
        task_id=t.id,
        instance_id=t.instance_id,
        from_user_id=user.id,
        from_role=payload.from_role,
        to_employee_id=t.assigned_to_employee_id,
        rating=payload.rating,
        score=payload.score,
        strengths=payload.strengths,
        weaknesses=payload.weaknesses,
        comment=payload.comment,
        decision=payload.decision,
        rubric_scores_json=payload.rubric_scores,
        visibility=payload.visibility,
    )
    db.add(fb)
    decision_to_status = {
        "approved": ("approved", True),
        "needs_improvement": ("needs_improvement", False),
        "failed": ("failed", False),
    }
    new_status, finalise = decision_to_status[payload.decision]
    t.status = new_status
    t.reviewed_at = datetime.now(UTC)
    if payload.score is not None:
        t.score = payload.score
    if finalise:
        t.completed_at = datetime.now(UTC)
    t.assignment_history_json = list(t.assignment_history_json or []) + [
        {
            "actor_user_id": user.id,
            "actor_role": payload.from_role,
            "action": f"reviewed_{payload.decision}",
            "at": datetime.now(UTC).isoformat(),
        }
    ]
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=t.assigned_to_employee_id,
        title=f"Feedback on: {t.title}",
        message=f"Decision: {payload.decision.replace('_', ' ')}.",
        type_="feedback_left",
        target_url=f"/learner/onboarding-os/tasks/{t.id}",
    )
    await _refresh_progress(db, inst)
    await db.commit()
    await db.refresh(fb)
    base = TaskFeedbackRead.model_validate(fb)
    base.from_name = await _user_name(db, fb.from_user_id)
    return base


@router.get("/tasks/{task_id}/feedback", response_model=list[TaskFeedbackRead])
async def list_task_feedback(
    task_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TaskFeedbackRead]:
    rows = (
        await db.execute(
            select(OnbTaskFeedback)
            .where(OnbTaskFeedback.task_id == task_id)
            .order_by(OnbTaskFeedback.created_at.desc())
        )
    ).scalars().all()
    out: list[TaskFeedbackRead] = []
    for r in rows:
        base = TaskFeedbackRead.model_validate(r)
        base.from_name = await _user_name(db, r.from_user_id)
        out.append(base)
    return out


# ---------------------------------------------------------------------------
# Reviews + buddy + employee feedback
# ---------------------------------------------------------------------------
@router.post(
    "/instances/{instance_id}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    instance_id: int,
    payload: ReviewCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ReviewRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    r = OnbReview(
        instance_id=instance_id,
        review_type=payload.review_type,
        reviewer_user_id=user.id,
        reviewer_employee_id=inst.manager_id,
        role_clarity_score=payload.role_clarity_score,
        workflow_score=payload.workflow_score,
        communication_score=payload.communication_score,
        ownership_score=payload.ownership_score,
        productivity_score=payload.productivity_score,
        culture_score=payload.culture_score,
        strengths=payload.strengths,
        weaknesses=payload.weaknesses,
        next_goals=payload.next_goals,
        decision=payload.decision,
    )
    db.add(r)
    if payload.review_type == "final":
        inst.final_decision = payload.decision
        if payload.decision in {"ready", "ready_with_support"}:
            inst.status = "completed"
        elif payload.decision == "extended":
            inst.status = "extended"
        elif payload.decision == "needs_pip":
            inst.status = "needs_pip"
        elif payload.decision == "not_ready":
            inst.status = "failed"
    await db.commit()
    await db.refresh(r)
    base = ReviewRead.model_validate(r)
    base.reviewer_name = await _user_name(db, r.reviewer_user_id)
    return base


@router.get("/instances/{instance_id}/reviews", response_model=list[ReviewRead])
async def list_reviews(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[ReviewRead]:
    rows = (
        await db.execute(
            select(OnbReview)
            .where(OnbReview.instance_id == instance_id)
            .order_by(OnbReview.created_at.desc())
        )
    ).scalars().all()
    out: list[ReviewRead] = []
    for r in rows:
        base = ReviewRead.model_validate(r)
        base.reviewer_name = await _user_name(db, r.reviewer_user_id)
        out.append(base)
    return out


@router.post(
    "/instances/{instance_id}/buddy-checkin",
    response_model=BuddyCheckInRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_buddy_checkin(
    instance_id: int,
    payload: BuddyCheckInCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> BuddyCheckInRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    if not inst.buddy_id:
        raise HTTPException(status_code=400, detail="No buddy assigned to this instance")
    c = OnbBuddyCheckIn(
        instance_id=instance_id,
        buddy_employee_id=inst.buddy_id,
        employee_id=inst.employee_id,
        culture_score=payload.culture_score,
        connection_score=payload.connection_score,
        comment=payload.comment,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    base = BuddyCheckInRead.model_validate(c)
    base.buddy_name = await _employee_name(db, c.buddy_employee_id)
    return base


@router.post(
    "/instances/{instance_id}/employee-feedback",
    response_model=EmployeeFeedbackRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_employee_feedback(
    instance_id: int,
    payload: EmployeeFeedbackCreate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> EmployeeFeedbackRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    fb = OnbEmployeeFeedback(
        instance_id=instance_id,
        employee_id=inst.employee_id,
        confidence_score=payload.confidence_score,
        clarity_score=payload.clarity_score,
        support_score=payload.support_score,
        comment=payload.comment,
        blockers=payload.blockers,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return EmployeeFeedbackRead.model_validate(fb)


# ---------------------------------------------------------------------------
# AI surfaces — risk, mentor, simulation, feedback summary
# ---------------------------------------------------------------------------
@router.post("/instances/{instance_id}/analyze-risk", response_model=AIRecommendationRead)
async def analyze_risk(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> AIRecommendationRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    tasks = (
        await db.execute(select(OnbTask).where(OnbTask.instance_id == instance_id))
    ).scalars().all()
    now = datetime.now(UTC)
    snapshot = {
        "overdue_tasks": sum(
            1
            for t in tasks
            if t.due_date and t.due_date < now and t.status not in {"approved", "completed"}
        ),
        "failed_tasks": sum(1 for t in tasks if t.status == "failed"),
        "avg_quiz_score": (
            sum(t.score for t in tasks if isinstance(t.score, int)) / max(1, sum(1 for t in tasks if isinstance(t.score, int)))
        ) if any(isinstance(t.score, int) for t in tasks) else 100,
        "stage": _current_stage(inst.start_date),
        "department": inst.department,
    }
    result = await ai_service.os_analyze_risk(snapshot)
    rec = OnbAIRecommendation(
        instance_id=inst.id,
        risk_level=result.get("risk_level", "low"),
        reason=result.get("reason", ""),
        recommended_action=result.get("recommended_action", ""),
        recommended_training=result.get("recommended_training", []),
        notify_roles=result.get("notify_roles", []),
        payload_json=result,
    )
    db.add(rec)
    inst.risk_level = rec.risk_level
    if rec.risk_level == "high":
        await _notify(
            db,
            company_id=user.company_id,
            user_id=user.id,
            title=f"High-risk onboarding: {await _employee_name(db, inst.employee_id)}",
            message=rec.reason,
            type_="high_risk_detected",
            target_url=f"/admin/onboarding-os/instances/{inst.id}",
        )
    await db.commit()
    await db.refresh(rec)
    return AIRecommendationRead.model_validate(rec)


@router.get(
    "/instances/{instance_id}/ai-recommendations",
    response_model=list[AIRecommendationRead],
)
async def list_recommendations(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[AIRecommendationRead]:
    rows = (
        await db.execute(
            select(OnbAIRecommendation)
            .where(OnbAIRecommendation.instance_id == instance_id)
            .order_by(OnbAIRecommendation.created_at.desc())
        )
    ).scalars().all()
    return [AIRecommendationRead.model_validate(r) for r in rows]


@router.post("/instances/{instance_id}/mentor", response_model=MentorAnswer)
async def ask_mentor(
    instance_id: int,
    payload: MentorQuestion,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> MentorAnswer:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    tasks = (
        await db.execute(
            select(OnbTask)
            .where(OnbTask.instance_id == instance_id)
            .where(OnbTask.status.in_(["not_started", "in_progress", "needs_improvement"]))
            .order_by(OnbTask.due_date.asc().nullslast())
            .limit(5)
        )
    ).scalars().all()
    context = {
        "instance": {
            "role": inst.role_name,
            "department": inst.department,
            "stage": _current_stage(inst.start_date),
        },
        "manager_name": await _employee_name(db, inst.manager_id),
        "supervisor_name": await _employee_name(db, inst.supervisor_id),
        "buddy_name": await _employee_name(db, inst.buddy_id),
        "next_tasks": [
            {"title": t.title, "due": t.due_date.isoformat() if t.due_date else None}
            for t in tasks
        ],
    }
    res = await ai_service.os_mentor_answer(payload.question, context)
    return MentorAnswer(**res)


# ---------------------------------------------------------------------------
# Dashboards
# ---------------------------------------------------------------------------
@router.get("/dashboard/hr", response_model=HRDashboard)
async def hr_dashboard(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> HRDashboard:
    instances = (
        await db.execute(
            select(OnbInstance).where(OnbInstance.company_id == user.company_id)
        )
    ).scalars().all()
    cards = [await _instance_card(db, i) for i in instances]
    active = [i for i in instances if i.status not in {"completed", "failed"}]
    completed = [i for i in instances if i.status == "completed"]
    overdue = sum(c.overdue_tasks for c in cards)
    pending = sum(c.pending_reviews for c in cards)
    avg_progress = (sum(c.overall_progress for c in cards) / len(cards)) if cards else 0.0
    avg_readiness = (sum(c.readiness_score for c in cards) / len(cards)) if cards else 0.0
    high_risk = sum(1 for c in cards if c.risk_level == "high")

    # Compliance completion across all tasks
    all_tasks = (
        await db.execute(select(OnbTask).where(OnbTask.instance_id.in_([i.id for i in instances] or [-1])))
    ).scalars().all()
    compliance_tasks = [t for t in all_tasks if t.category == "compliance"]
    compliance_done = [t for t in compliance_tasks if t.status in {"approved", "completed"}]
    compliance_rate = (len(compliance_done) / len(compliance_tasks)) if compliance_tasks else 0.0

    # Reviews pending — count instances missing 30 / 60 / 90 reviews per stage day
    reviews_by_inst: dict[int, set[str]] = defaultdict(set)
    review_rows = (
        await db.execute(
            select(OnbReview).where(OnbReview.instance_id.in_([i.id for i in instances] or [-1]))
        )
    ).scalars().all()
    for r in review_rows:
        reviews_by_inst[r.instance_id].add(r.review_type)
    manager_pending = 0
    for c in cards:
        seen = reviews_by_inst.get(c.id, set())
        days = (datetime.now(UTC) - c.start_date).days
        if days >= 30 and "30_day" not in seen:
            manager_pending += 1
        if days >= 60 and "60_day" not in seen:
            manager_pending += 1
        if days >= 90 and "90_day" not in seen:
            manager_pending += 1

    sup_pending = sum(
        1
        for t in all_tasks
        if t.status == "submitted" and (t.reviewer_role in {"supervisor", "manager"})
    )

    # Employee satisfaction — average of latest self-feedback scores
    emp_fb = (
        await db.execute(
            select(OnbEmployeeFeedback).where(
                OnbEmployeeFeedback.instance_id.in_([i.id for i in instances] or [-1])
            )
        )
    ).scalars().all()
    satisfaction = (
        (sum(f.confidence_score + f.clarity_score + f.support_score for f in emp_fb) / (3 * len(emp_fb)))
        if emp_fb
        else 0.0
    )

    return HRDashboard(
        total_active=len(active),
        completed=len(completed),
        average_progress=round(avg_progress, 1),
        average_readiness=round(avg_readiness, 1),
        overdue_tasks=overdue,
        pending_approvals=pending,
        compliance_completion_rate=round(compliance_rate, 4),
        high_risk_count=high_risk,
        manager_reviews_pending=manager_pending,
        supervisor_reviews_pending=sup_pending,
        employee_satisfaction=round(satisfaction, 2),
        instances=cards,
    )


@router.get("/dashboard/manager/{manager_employee_id}", response_model=ManagerDashboard)
async def manager_dashboard(
    manager_employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ManagerDashboard:
    mgr = await _ensure_employee(db, user.company_id, manager_employee_id)
    instances = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.company_id == user.company_id,
                OnbInstance.manager_id == mgr.id,
            )
        )
    ).scalars().all()
    cards = [await _instance_card(db, i) for i in instances]
    high_risk = sum(1 for c in cards if c.risk_level == "high")
    overdue = sum(c.overdue_tasks for c in cards)
    pending = sum(c.pending_reviews for c in cards)
    return ManagerDashboard(
        manager_id=mgr.id,
        manager_name=mgr.name,
        new_hires=cards,
        pending_reviews=pending,
        overdue_tasks=overdue,
        high_risk_count=high_risk,
    )


@router.get(
    "/dashboard/supervisor/{supervisor_employee_id}",
    response_model=SupervisorDashboard,
)
async def supervisor_dashboard(
    supervisor_employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> SupervisorDashboard:
    sup = await _ensure_employee(db, user.company_id, supervisor_employee_id)
    instances = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.company_id == user.company_id,
                OnbInstance.supervisor_id == sup.id,
            )
        )
    ).scalars().all()
    cards = [await _instance_card(db, i) for i in instances]
    iids = [i.id for i in instances] or [-1]
    tasks = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id.in_(iids),
                OnbTask.reviewer_employee_id == sup.id,
                OnbTask.status == "submitted",
            )
        )
    ).scalars().all()
    overdue = sum(c.overdue_tasks for c in cards)
    practical_scores = [
        t.score for t in (
            await db.execute(
                select(OnbTask).where(
                    OnbTask.instance_id.in_(iids),
                    OnbTask.category == "practical",
                    OnbTask.score.is_not(None),
                )
            )
        ).scalars()
        if t.score is not None
    ]
    avg_practical = (sum(practical_scores) / len(practical_scores)) if practical_scores else 0.0
    pending_tasks_read: list[TaskRead] = []
    for t in tasks:
        pending_tasks_read.append(await _task_read(db, t))
    return SupervisorDashboard(
        supervisor_id=sup.id,
        supervisor_name=sup.name,
        new_hires=cards,
        pending_review_tasks=pending_tasks_read,
        overdue_tasks=overdue,
        avg_practical_score=round(avg_practical, 1),
    )


@router.get(
    "/dashboard/buddy/{buddy_employee_id}",
    response_model=BuddyDashboard,
)
async def buddy_dashboard(
    buddy_employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> BuddyDashboard:
    bud = await _ensure_employee(db, user.company_id, buddy_employee_id)
    instances = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.company_id == user.company_id,
                OnbInstance.buddy_id == bud.id,
            )
        )
    ).scalars().all()
    cards = [await _instance_card(db, i) for i in instances]
    iids = [i.id for i in instances] or [-1]

    checkins = (
        await db.execute(
            select(OnbBuddyCheckIn)
            .where(OnbBuddyCheckIn.instance_id.in_(iids))
            .order_by(OnbBuddyCheckIn.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    checkin_reads: list[BuddyCheckInRead] = []
    last_by_inst: dict[int, datetime | None] = {i.id: None for i in instances}
    for c in checkins:
        base = BuddyCheckInRead.model_validate(c)
        base.buddy_name = bud.name
        checkin_reads.append(base)
        if last_by_inst.get(c.instance_id) is None:
            last_by_inst[c.instance_id] = c.created_at

    open_help = (
        await db.execute(
            select(OnbHelpRequest).where(
                OnbHelpRequest.instance_id.in_(iids),
                OnbHelpRequest.target_role == "buddy",
                OnbHelpRequest.status.in_(["open", "responded"]),
            )
        )
    ).scalars().all()
    at_risk = sum(1 for c in cards if c.risk_level in {"medium", "high"})

    return BuddyDashboard(
        buddy_id=bud.id,
        buddy_name=bud.name,
        new_hires=cards,
        recent_checkins=checkin_reads,
        last_checkin_by_instance=last_by_inst,
        open_help_requests=len(open_help),
        at_risk_hires=at_risk,
    )


@router.get(
    "/dashboard/it/{it_employee_id}",
    response_model=ITDashboard,
)
async def it_dashboard(
    it_employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ITDashboard:
    it = await _ensure_employee(db, user.company_id, it_employee_id)
    instances = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.company_id == user.company_id,
                OnbInstance.it_owner_id == it.id,
            )
        )
    ).scalars().all()
    cards = [await _instance_card(db, i) for i in instances]
    iids = [i.id for i in instances] or [-1]

    setup_tasks = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id.in_(iids),
                OnbTask.category == "it_setup",
            )
        )
    ).scalars().all()
    pending = [
        t for t in setup_tasks if t.status not in {"approved", "completed"}
    ]
    completed = len(setup_tasks) - len(pending)
    now = datetime.now(UTC)
    overdue = sum(
        1
        for t in pending
        if t.due_date and t.due_date < now
    )
    blocked = sum(1 for t in pending if t.status == "blocked")
    today = now.date()
    due_today = sum(
        1
        for t in pending
        if t.due_date and t.due_date.date() == today
    )
    week_ago = now - timedelta(days=7)
    completed_this_week = sum(
        1
        for t in setup_tasks
        if t.completed_at and t.completed_at >= week_ago
    )

    pending_read: list[TaskRead] = []
    for t in pending:
        pending_read.append(await _task_read(db, t))

    return ITDashboard(
        it_id=it.id,
        it_name=it.name,
        new_hires=cards,
        pending_setup_tasks=pending_read,
        completed_setup_tasks=completed,
        overdue_tasks=overdue,
        blocked_tasks=blocked,
        due_today=due_today,
        completed_this_week=completed_this_week,
    )


# ---------------------------------------------------------------------------
# IT — listing + complete + block actions on it_setup tasks
# ---------------------------------------------------------------------------
def _is_overdue(t: OnbTask, now: datetime) -> bool:
    return bool(t.due_date) and t.due_date < now and t.status not in {"approved", "completed"}


@router.get("/it/tasks", response_model=list[TaskRead])
async def it_tasks(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    status: str | None = None,
    employee_id: int | None = None,
) -> list[TaskRead]:
    """List every IT-category task in the company, optionally filtered."""
    # Only company-owned instances
    inst_ids_rows = (
        await db.execute(
            select(OnbInstance.id).where(OnbInstance.company_id == user.company_id)
        )
    ).all()
    inst_ids = [r[0] for r in inst_ids_rows] or [-1]
    q = select(OnbTask).where(
        OnbTask.instance_id.in_(inst_ids), OnbTask.category == "it_setup"
    )
    if status:
        q = q.where(OnbTask.status == status)
    if employee_id:
        q = q.where(OnbTask.assigned_to_employee_id == employee_id)
    rows = (
        await db.execute(q.order_by(OnbTask.due_date.asc().nullslast(), OnbTask.id))
    ).scalars().all()
    out: list[TaskRead] = []
    for t in rows:
        out.append(await _task_read(db, t))
    return out


@router.get("/it/tasks/pending", response_model=list[TaskRead])
async def it_tasks_pending(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TaskRead]:
    inst_ids_rows = (
        await db.execute(
            select(OnbInstance.id).where(OnbInstance.company_id == user.company_id)
        )
    ).all()
    inst_ids = [r[0] for r in inst_ids_rows] or [-1]
    rows = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id.in_(inst_ids),
                OnbTask.category == "it_setup",
                OnbTask.status.in_(["not_started", "in_progress", "submitted"]),
            )
        )
    ).scalars().all()
    out: list[TaskRead] = []
    for t in rows:
        out.append(await _task_read(db, t))
    return out


@router.get("/it/tasks/overdue", response_model=list[TaskRead])
async def it_tasks_overdue(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TaskRead]:
    inst_ids_rows = (
        await db.execute(
            select(OnbInstance.id).where(OnbInstance.company_id == user.company_id)
        )
    ).all()
    inst_ids = [r[0] for r in inst_ids_rows] or [-1]
    rows = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id.in_(inst_ids),
                OnbTask.category == "it_setup",
            )
        )
    ).scalars().all()
    now = datetime.now(UTC)
    out: list[TaskRead] = []
    for t in rows:
        if _is_overdue(t, now):
            out.append(await _task_read(db, t))
    return out


@router.get("/it/tasks/blocked", response_model=list[TaskRead])
async def it_tasks_blocked(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TaskRead]:
    inst_ids_rows = (
        await db.execute(
            select(OnbInstance.id).where(OnbInstance.company_id == user.company_id)
        )
    ).all()
    inst_ids = [r[0] for r in inst_ids_rows] or [-1]
    rows = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id.in_(inst_ids),
                OnbTask.category == "it_setup",
                OnbTask.status == "blocked",
            )
        )
    ).scalars().all()
    out: list[TaskRead] = []
    for t in rows:
        out.append(await _task_read(db, t))
    return out


@router.post("/it/tasks/{task_id}/complete", response_model=TaskRead)
async def it_task_complete(
    task_id: int,
    payload: ITTaskComplete,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    now = datetime.now(UTC)
    t.status = "approved" if t.approval_required else "completed"
    t.completed_at = now
    t.reviewed_at = now
    if payload.score is not None:
        t.score = payload.score
    t.assignment_history_json = list(t.assignment_history_json or []) + [
        {
            "actor_user_id": user.id,
            "actor_role": "it",
            "action": "completed",
            "note": payload.note or "",
            "asset_id": payload.asset_id,
            "at": now.isoformat(),
        }
    ]
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=t.assigned_to_employee_id,
        title=f"IT setup complete: {t.title}",
        message=payload.note or "Your IT setup task is ready.",
        type_="task_approved",
        target_url=f"/learner/onboarding-os/timeline",
    )
    await _refresh_progress(db, inst)
    await db.commit()
    await db.refresh(t)
    return await _task_read(db, t)


@router.post("/it/tasks/{task_id}/block", response_model=TaskRead)
async def it_task_block(
    task_id: int,
    payload: ITTaskBlock,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    now = datetime.now(UTC)
    t.status = "blocked"
    t.assignment_history_json = list(t.assignment_history_json or []) + [
        {
            "actor_user_id": user.id,
            "actor_role": "it",
            "action": "blocked",
            "reason": payload.reason,
            "note": payload.note or "",
            "at": now.isoformat(),
        }
    ]
    # Notify HR + the new hire
    await _notify(
        db,
        company_id=user.company_id,
        user_id=user.id,
        title=f"IT task blocked: {t.title}",
        message=f"Reason: {payload.reason}",
        type_="needs_improvement",
        target_url=f"/admin/onboarding-os/instances/{inst.id}",
    )
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=t.assigned_to_employee_id,
        title=f"Setup blocked: {t.title}",
        message=f"Reason: {payload.reason}. IT will follow up.",
        type_="needs_improvement",
        target_url=f"/learner/onboarding-os/timeline",
    )
    await db.commit()
    await db.refresh(t)
    return await _task_read(db, t)


@router.put("/it/tasks/{task_id}/status", response_model=TaskRead)
async def it_task_status(
    task_id: int,
    payload: ITTaskStatusUpdate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TaskRead:
    """Generic status update for an IT-setup task."""
    t = (await db.execute(select(OnbTask).where(OnbTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == t.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    now = datetime.now(UTC)
    t.status = payload.status
    if payload.status == "completed":
        t.completed_at = now
    t.assignment_history_json = list(t.assignment_history_json or []) + [
        {
            "actor_user_id": user.id,
            "actor_role": "it",
            "action": f"status_{payload.status}",
            "note": payload.note,
            "block_reason": payload.block_reason,
            "asset_id": payload.asset_id,
            "at": now.isoformat(),
        }
    ]
    await _refresh_progress(db, inst)
    await db.commit()
    await db.refresh(t)
    return await _task_read(db, t)


@router.get(
    "/it/employees/{employee_id}/setup",
    response_model=ITSetupForEmployee,
)
async def it_employee_setup(
    employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ITSetupForEmployee:
    """Per-employee IT setup checklist (every it_setup task on their instance)."""
    emp = await _ensure_employee(db, user.company_id, employee_id)
    inst = (
        await db.execute(
            select(OnbInstance)
            .where(OnbInstance.employee_id == emp.id)
            .order_by(OnbInstance.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not inst:
        return ITSetupForEmployee(
            employee_id=emp.id,
            employee_name=emp.name,
            instance_id=None,
            items=[],
            completion_rate=0.0,
        )
    tasks = (
        await db.execute(
            select(OnbTask).where(
                OnbTask.instance_id == inst.id,
                OnbTask.category == "it_setup",
            )
        )
    ).scalars().all()
    items: list[ITSetupItem] = []
    for t in tasks:
        history = t.assignment_history_json or []
        blocker = next(
            (h.get("reason") for h in reversed(history) if h.get("action") == "blocked"),
            None,
        )
        asset = next(
            (h.get("asset_id") for h in reversed(history) if h.get("asset_id")),
            None,
        )
        reviewer = await _employee_name(db, t.reviewer_employee_id)
        items.append(
            ITSetupItem(
                task_id=t.id,
                title=t.title,
                status=t.status,
                due_date=t.due_date,
                blocker_reason=blocker if t.status == "blocked" else None,
                completed_at=t.completed_at,
                asset_id=asset,
                reviewer_name=reviewer,
            )
        )
    done = sum(1 for i in items if i.status in {"approved", "completed"})
    return ITSetupForEmployee(
        employee_id=emp.id,
        employee_name=emp.name,
        instance_id=inst.id,
        items=items,
        completion_rate=(done / len(items)) if items else 0.0,
    )


# ---------------------------------------------------------------------------
# Help requests
# ---------------------------------------------------------------------------
async def _help_request_read(db: AsyncSession, h: OnbHelpRequest) -> HelpRequestRead:
    employee = (
        await db.execute(select(Employee).where(Employee.id == h.employee_id))
    ).scalar_one_or_none()
    responder = (
        (await db.execute(select(Employee).where(Employee.id == h.responded_by_employee_id))).scalar_one_or_none()
        if h.responded_by_employee_id
        else None
    )
    base = HelpRequestRead.model_validate(h)
    base.employee_name = employee.name if employee else None
    base.responder_name = responder.name if responder else None
    return base


@router.post(
    "/instances/{instance_id}/help-requests",
    response_model=HelpRequestRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_help_request(
    instance_id: int,
    payload: HelpRequestCreate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> HelpRequestRead:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    h = OnbHelpRequest(
        instance_id=instance_id,
        employee_id=inst.employee_id,
        target_role=payload.target_role,
        message=payload.message,
        task_id=payload.task_id,
        priority=payload.priority,
    )
    db.add(h)
    # Notify the targeted role's owner if known
    routing = {
        "buddy": inst.buddy_id,
        "manager": inst.manager_id,
        "supervisor": inst.supervisor_id,
        "it": inst.it_owner_id,
    }
    eid = routing.get(payload.target_role)
    if eid:
        await _notify(
            db,
            company_id=user.company_id,
            employee_id=eid,
            title=f"Help request from {await _employee_name(db, inst.employee_id) or 'a new hire'}",
            message=payload.message[:200],
            type_="task_assigned",
            target_url=f"/{payload.target_role}/help-requests",
            payload={"help_request_id": None},
        )
    if payload.target_role == "hr":
        # HR is the admin user — notify by user_id
        await _notify(
            db,
            company_id=user.company_id,
            user_id=user.id,
            title="New help request — HR",
            message=payload.message[:200],
            type_="task_assigned",
            target_url=f"/admin/onboarding-os/instances/{inst.id}",
        )
    await db.commit()
    await db.refresh(h)
    return await _help_request_read(db, h)


@router.get("/help-requests", response_model=list[HelpRequestRead])
async def list_help_requests(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    target_role: str | None = None,
    status: str | None = None,
    instance_id: int | None = None,
) -> list[HelpRequestRead]:
    inst_ids_rows = (
        await db.execute(
            select(OnbInstance.id).where(OnbInstance.company_id == user.company_id)
        )
    ).all()
    inst_ids = [r[0] for r in inst_ids_rows] or [-1]
    q = select(OnbHelpRequest).where(OnbHelpRequest.instance_id.in_(inst_ids))
    if target_role:
        q = q.where(OnbHelpRequest.target_role == target_role)
    if status:
        q = q.where(OnbHelpRequest.status == status)
    if instance_id:
        q = q.where(OnbHelpRequest.instance_id == instance_id)
    rows = (
        await db.execute(q.order_by(OnbHelpRequest.created_at.desc()).limit(50))
    ).scalars().all()
    out: list[HelpRequestRead] = []
    for h in rows:
        out.append(await _help_request_read(db, h))
    return out


@router.post(
    "/help-requests/{help_request_id}/respond",
    response_model=HelpRequestRead,
)
async def respond_help_request(
    help_request_id: int,
    payload: HelpRequestRespond,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> HelpRequestRead:
    h = (
        await db.execute(select(OnbHelpRequest).where(OnbHelpRequest.id == help_request_id))
    ).scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Help request not found")
    inst = (
        await db.execute(select(OnbInstance).where(OnbInstance.id == h.instance_id))
    ).scalar_one()
    if inst.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    # Resolve responder Employee (best-effort by email)
    responder = (
        await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id, Employee.email == user.email
            )
        )
    ).scalar_one_or_none()
    h.response_text = payload.response_text
    h.responded_by_employee_id = responder.id if responder else None
    h.responded_at = datetime.now(UTC)
    h.status = "closed" if payload.close else "responded"
    await _notify(
        db,
        company_id=user.company_id,
        employee_id=h.employee_id,
        title=f"Reply from your {h.target_role}",
        message=payload.response_text[:200],
        type_="feedback_left",
        target_url=f"/learner/onboarding-os/timeline",
    )
    await db.commit()
    await db.refresh(h)
    return await _help_request_read(db, h)


@router.get("/employee/{employee_id}/timeline", response_model=EmployeeTimeline)
async def employee_timeline(
    employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> EmployeeTimeline:
    emp = await _ensure_employee(db, user.company_id, employee_id)
    inst = (
        await db.execute(
            select(OnbInstance)
            .where(OnbInstance.employee_id == emp.id)
            .order_by(OnbInstance.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="No onboarding instance for this employee")
    tasks = (
        await db.execute(
            select(OnbTask)
            .where(OnbTask.instance_id == inst.id)
            .order_by(OnbTask.due_date.asc().nullslast(), OnbTask.id)
        )
    ).scalars().all()
    stages: list[dict[str, Any]] = []
    for s in STAGE_ORDER:
        stage_tasks = [t for t in tasks if t.stage == s]
        done = sum(1 for t in stage_tasks if t.status in {"approved", "completed"})
        stages.append(
            {
                "stage": s,
                "label": s.replace("_", " ").title(),
                "total": len(stage_tasks),
                "completed": done,
                "tasks": [(await _task_read(db, t)).model_dump() for t in stage_tasks],
            }
        )
    now = datetime.now(UTC)
    overdue = [t for t in tasks if t.due_date and t.due_date < now and t.status not in {"approved", "completed"}]
    next_tasks = [
        t for t in tasks if t.status in {"not_started", "in_progress", "needs_improvement"}
    ][:5]
    next_reads: list[TaskRead] = []
    for t in next_tasks:
        next_reads.append(await _task_read(db, t))
    overdue_reads: list[TaskRead] = []
    for t in overdue:
        overdue_reads.append(await _task_read(db, t))
    return EmployeeTimeline(
        instance=InstanceRead.model_validate(inst),
        employee_name=emp.name,
        manager_name=await _employee_name(db, inst.manager_id),
        supervisor_name=await _employee_name(db, inst.supervisor_id),
        buddy_name=await _employee_name(db, inst.buddy_id),
        current_stage=_current_stage(inst.start_date),
        stages=stages,
        next_tasks=next_reads,
        overdue_tasks=overdue_reads,
        completed_count=sum(1 for t in tasks if t.status in {"approved", "completed"}),
        total_count=len(tasks),
    )


# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------
@router.post("/instances/{instance_id}/generate-report", response_model=FinalReport)
async def generate_final_report(
    instance_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> FinalReport:
    inst = (
        await db.execute(
            select(OnbInstance).where(
                OnbInstance.id == instance_id, OnbInstance.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")
    tasks = (
        await db.execute(select(OnbTask).where(OnbTask.instance_id == inst.id))
    ).scalars().all()
    reviews = (
        await db.execute(
            select(OnbReview)
            .where(OnbReview.instance_id == inst.id)
            .order_by(OnbReview.created_at)
        )
    ).scalars().all()
    buddy = (
        await db.execute(
            select(OnbBuddyCheckIn)
            .where(OnbBuddyCheckIn.instance_id == inst.id)
            .order_by(OnbBuddyCheckIn.created_at)
        )
    ).scalars().all()
    emp_fb = (
        await db.execute(
            select(OnbEmployeeFeedback)
            .where(OnbEmployeeFeedback.instance_id == inst.id)
            .order_by(OnbEmployeeFeedback.created_at)
        )
    ).scalars().all()
    risk_history = (
        await db.execute(
            select(OnbAIRecommendation)
            .where(OnbAIRecommendation.instance_id == inst.id)
            .order_by(OnbAIRecommendation.created_at)
        )
    ).scalars().all()
    feedback_items = (
        await db.execute(select(OnbTaskFeedback).where(OnbTaskFeedback.instance_id == inst.id))
    ).scalars().all()

    completed = sum(1 for t in tasks if t.status in {"approved", "completed"})
    incomplete = len(tasks) - completed
    compliance_tasks = [t for t in tasks if t.category == "compliance"]
    compliance_complete = all(t.status in {"approved", "completed"} for t in compliance_tasks)
    quiz_scores = [t.score for t in tasks if t.category in {"compliance", "role_training"} and t.score is not None]
    practical_scores = [t.score for t in tasks if t.category == "practical" and t.score is not None]
    quiz_avg = (sum(quiz_scores) / len(quiz_scores)) if quiz_scores else 0.0
    pract_avg = (sum(practical_scores) / len(practical_scores)) if practical_scores else 0.0

    summary = await ai_service.os_summarize_feedback(
        [
            {
                "from_role": f.from_role,
                "decision": f.decision,
                "strengths": f.strengths,
                "weaknesses": f.weaknesses,
                "comment": f.comment[:240],
            }
            for f in feedback_items
        ]
    )
    decision = inst.final_decision or (
        "ready"
        if compliance_complete and inst.readiness_score >= 70 and inst.risk_level != "high"
        else "ready_with_support"
        if compliance_complete and inst.readiness_score >= 60
        else "extended"
    )
    next_plan = [
        f"Continue weekly 1:1 with {await _employee_name(db, inst.manager_id) or 'manager'}",
        "Pair with a senior teammate for the first month of solo delivery",
        "Quarterly security refresher",
    ]
    employee_name = await _employee_name(db, inst.employee_id) or "Employee"
    return FinalReport(
        instance=InstanceRead.model_validate(inst),
        employee_name=employee_name,
        completed_tasks=completed,
        incomplete_tasks=incomplete,
        compliance_complete=compliance_complete,
        quiz_average=round(quiz_avg, 1),
        practical_average=round(pract_avg, 1),
        manager_reviews=[
            ReviewRead.model_validate(r) for r in reviews if r.review_type != "final"
        ],
        supervisor_feedback_count=sum(1 for f in feedback_items if f.from_role == "supervisor"),
        buddy_checkins=[BuddyCheckInRead.model_validate(b) for b in buddy],
        employee_feedback=[EmployeeFeedbackRead.model_validate(f) for f in emp_fb],
        strengths=summary.get("strengths", [])[:5],
        weaknesses=summary.get("weaknesses", [])[:5],
        risk_history=[AIRecommendationRead.model_validate(r) for r in risk_history],
        ai_recommendation=summary.get("summary", ""),
        final_decision=decision,
        next_development_plan=next_plan,
    )


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    unread_only: bool = False,
) -> list[NotificationRead]:
    q = select(OnbNotification).where(
        OnbNotification.company_id == user.company_id,
        OnbNotification.user_id == user.id,
    )
    if unread_only:
        q = q.where(OnbNotification.is_read.is_(False))
    rows = (await db.execute(q.order_by(OnbNotification.created_at.desc()).limit(50))).scalars().all()
    return [NotificationRead.model_validate(r) for r in rows]


@router.post("/notifications/{notification_id}/read", response_model=GenericMessage)
async def mark_read(
    notification_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    n = (
        await db.execute(
            select(OnbNotification).where(
                OnbNotification.id == notification_id,
                OnbNotification.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    await db.commit()
    return GenericMessage(message="Marked read")
