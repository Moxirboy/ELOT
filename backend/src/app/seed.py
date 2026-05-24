"""Seed demo data for ELOT AI.

Run with:
    cd backend/src
    uv run python -m app.seed

Idempotent: re-running will not duplicate rows. Pass ``--reset`` to
drop ELOT rows first (useful when iterating).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select

from .core.db.database import async_engine, local_session
from .core.db.database import Base
from .models import (
    AIInterview,
    Assignment,
    Candidate,
    CandidateQuizAttempt,
    CandidateScorecard,
    CandidateTrainingModule,
    Certificate,
    Company,
    Course,
    ElotUser,
    Employee,
    GeneratedTraining,
    JobRole,
    Lesson,
    OnboardingPlan,
    PhishingTest,
    PhishingTestResult,
    Policy,
    QuizQuestion,
    Scenario,
    ScenarioAttempt,
    ThreatReport,
    ThreatSource,
    ThreatTrend,
)
from .services.defang import defang
from .services.sample_data import sample_course
from .services.sample_hiring import (
    sample_answer_evaluation,
    sample_onboarding_plan,
    sample_role_plan,
    sample_scorecard,
)
from .services.sample_threats import (
    SAMPLE_SOURCES,
    SAMPLE_TREND_BUNDLES,
    sample_training_for_trend,
)

DEMO_COMPANY = "GDG Demo Corp"

EMPLOYEES = [
    # name, email, department, role, risk
    ("Aziza Karimova", "aziza.k@gdgdemo.com", "HR", "HR Manager", "low"),
    ("Bekzod Yusupov", "bekzod.y@gdgdemo.com", "Engineering", "Backend Engineer", "medium"),
    ("Dilnoza Saidova", "dilnoza.s@gdgdemo.com", "Engineering", "Frontend Engineer", "high"),
    ("Elyor Akhmedov", "elyor.a@gdgdemo.com", "Sales", "Account Executive", "medium"),
    ("Feruza Tashkentova", "feruza.t@gdgdemo.com", "Sales", "Sales Lead", "low"),
    ("Gulnora Rakhimova", "gulnora.r@gdgdemo.com", "Operations", "Ops Specialist", "low"),
    ("Husan Khalilov", "husan.k@gdgdemo.com", "Operations", "Logistics", "medium"),
    ("Iroda Mukhammedova", "iroda.m@gdgdemo.com", "Management", "CTO", "low"),
    ("Jamshid Tursunov", "jamshid.t@gdgdemo.com", "Management", "CEO", "low"),
    ("Kamilla Nazarova", "kamilla.n@gdgdemo.com", "HR", "Recruiter", "medium"),
    ("Laziz Ortikov", "laziz.o@gdgdemo.com", "Engineering", "DevOps", "high"),
    ("Madina Rashidova", "madina.r@gdgdemo.com", "Sales", "BDR", "high"),
]

DEMO_POLICY_TEXT = (
    "Employees must not share customer data through personal email, Telegram, WhatsApp, USB "
    "drives, or public AI tools. Customer data must only be stored and transferred through "
    "approved company systems. If an employee receives suspicious links, requests for "
    "passwords, or unusual payment requests, they must report it to the security team "
    "immediately."
)

COURSE_TITLES = [
    "Cybersecurity Basics",
    "Data Privacy Essentials",
    "AI Usage Policy",
    "Workplace Conduct",
    "New Employee Onboarding",
]


async def reset_elot_tables(session) -> None:
    # Import OS tables lazily to keep the top-of-file imports tidy
    from .models import (
        OnbAIRecommendation,
        OnbBuddyCheckIn,
        OnbEmployeeFeedback,
        OnbInstance,
        OnbNotification,
        OnbReview,
        OnbTask,
        OnbTaskFeedback,
        OnbTaskSubmission,
        OnbTemplate,
        OnbTemplateTask,
    )

    for model in (
        OnbNotification,
        OnbAIRecommendation,
        OnbEmployeeFeedback,
        OnbBuddyCheckIn,
        OnbReview,
        OnbTaskFeedback,
        OnbTaskSubmission,
        OnbTask,
        OnbInstance,
        OnbTemplateTask,
        OnbTemplate,
        OnboardingPlan,
        CandidateScorecard,
        AIInterview,
        CandidateQuizAttempt,
        CandidateTrainingModule,
        Candidate,
        JobRole,
        PhishingTestResult,
        PhishingTest,
        GeneratedTraining,
        ThreatTrend,
        ThreatReport,
        ThreatSource,
        ScenarioAttempt,
        Certificate,
        Assignment,
        QuizQuestion,
        Scenario,
        Lesson,
        Course,
        Policy,
        Employee,
        ElotUser,
        Company,
    ):
        await session.execute(delete(model))
    await session.commit()


async def get_or_create_company(session) -> Company:
    result = await session.execute(select(Company).where(Company.name == DEMO_COMPANY))
    company = result.scalar_one_or_none()
    if company:
        return company
    company = Company(name=DEMO_COMPANY, industry="Technology")
    session.add(company)
    await session.commit()
    await session.refresh(company)
    return company


async def seed_admin_user(session, company: Company) -> ElotUser:
    result = await session.execute(select(ElotUser).where(ElotUser.email == "admin@gdgdemo.com"))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = ElotUser(
        company_id=company.id,
        email="admin@gdgdemo.com",
        full_name="Aziza Karimova",
        role="admin",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def seed_employees(session, company: Company) -> list[Employee]:
    existing = (
        await session.execute(select(Employee).where(Employee.company_id == company.id))
    ).scalars().all()
    if existing:
        return list(existing)
    employees: list[Employee] = []
    for name, email, dept, role, risk in EMPLOYEES:
        emp = Employee(
            company_id=company.id,
            name=name,
            email=email,
            department=dept,
            job_role=role,
            risk_level=risk,
        )
        session.add(emp)
        employees.append(emp)
    await session.commit()
    for e in employees:
        await session.refresh(e)
    return employees


async def seed_policy(session, company: Company) -> Policy:
    result = await session.execute(
        select(Policy).where(Policy.company_id == company.id).order_by(Policy.id)
    )
    existing = result.scalars().first()
    if existing:
        return existing
    policy = Policy(
        company_id=company.id,
        title="Data Protection & Acceptable Use Policy",
        content=DEMO_POLICY_TEXT,
        language="English",
    )
    session.add(policy)
    await session.commit()
    await session.refresh(policy)
    return policy


async def seed_courses(session, company: Company, policy: Policy) -> list[Course]:
    existing = (
        await session.execute(select(Course).where(Course.company_id == company.id))
    ).scalars().all()
    if existing and len(existing) >= len(COURSE_TITLES):
        return list(existing)

    courses: list[Course] = []
    for title in COURSE_TITLES:
        generated = sample_course(policy_title=title)
        course = Course(
            company_id=company.id,
            policy_id=policy.id,
            title=title,
            description=generated["description"],
            estimated_minutes=generated["estimatedMinutes"],
            difficulty=generated["difficulty"],
            language="English",
            generated_json=generated,
        )
        session.add(course)
        courses.append(course)
    await session.commit()
    for c in courses:
        await session.refresh(c)

    # Materialise lessons / scenarios / quiz
    for course in courses:
        gen = course.generated_json or {}
        for i, l in enumerate(gen.get("lessons", [])):
            session.add(
                Lesson(
                    course_id=course.id,
                    title=l.get("title", f"Lesson {i+1}"),
                    content=l.get("content", ""),
                    key_takeaway=l.get("keyTakeaway", ""),
                    order_index=i,
                )
            )
        for s in gen.get("scenarios", []):
            session.add(
                Scenario(
                    course_id=course.id,
                    title=s.get("title", "Scenario"),
                    situation=s.get("situation", ""),
                    question=s.get("question", ""),
                    ideal_answer=s.get("idealAnswer", ""),
                    risk_level=s.get("riskLevel", "medium"),
                    policy_reference=s.get("policyReference", ""),
                )
            )
        for q in gen.get("quiz", []):
            session.add(
                QuizQuestion(
                    course_id=course.id,
                    question=q.get("question", ""),
                    options_json=q.get("options", []),
                    correct_answer=q.get("correctAnswer", ""),
                    explanation=q.get("explanation", ""),
                    topic=q.get("topic", "General"),
                )
            )
    await session.commit()
    return courses


async def seed_assignments(session, company: Company, employees, courses) -> None:
    existing = (
        await session.execute(select(Assignment).where(Assignment.company_id == company.id))
    ).scalars().all()
    if existing:
        return

    statuses = ["completed", "in_progress", "not_started", "overdue"]
    rnd = random.Random(42)
    now = datetime.now(UTC)
    for emp in employees:
        for course in rnd.sample(courses, k=rnd.randint(2, len(courses))):
            status = rnd.choice(statuses)
            score = rnd.randint(40, 100) if status == "completed" else 0
            risk = emp.risk_level if status != "completed" else (
                "low" if score >= 80 else "medium" if score >= 60 else "high"
            )
            completed_at = now - timedelta(days=rnd.randint(1, 30)) if status == "completed" else None
            due_date = (
                now + timedelta(days=rnd.randint(2, 14))
                if status in ("not_started", "in_progress")
                else now - timedelta(days=rnd.randint(1, 7))
                if status == "overdue"
                else None
            )
            session.add(
                Assignment(
                    company_id=company.id,
                    employee_id=emp.id,
                    course_id=course.id,
                    status=status,
                    score=score,
                    risk_level=risk,
                    due_date=due_date,
                    completed_at=completed_at,
                )
            )
            if status == "completed" and score >= 60:
                session.add(
                    Certificate(
                        employee_id=emp.id,
                        course_id=course.id,
                        certificate_id=f"ELOT-{emp.id:04d}-{course.id:04d}-{int((completed_at or now).timestamp())}",
                        issued_at=completed_at or now,
                    )
                )
    await session.commit()


async def seed_threats(session) -> tuple[int, int]:
    """Seed sources + canned trend reports + AI summaries.

    Idempotent — checks by title before inserting.
    """
    existing_sources = (await session.execute(select(ThreatSource))).scalars().all()
    if not existing_sources:
        for s in SAMPLE_SOURCES:
            session.add(ThreatSource(**s))
        await session.commit()
        existing_sources = (await session.execute(select(ThreatSource))).scalars().all()

    sample_source = next(
        (s for s in existing_sources if s.source_type == "sample"),
        existing_sources[0],
    )

    new_reports = 0
    new_trends = 0
    for bundle in SAMPLE_TREND_BUNDLES:
        existing_report = (
            await session.execute(
                select(ThreatReport).where(ThreatReport.title == bundle["report"]["title"])
            )
        ).scalar_one_or_none()
        if existing_report:
            report = existing_report
        else:
            report = ThreatReport(
                source_id=sample_source.id,
                title=bundle["report"]["title"],
                summary=defang(bundle["report"]["summary"]),
                raw_content=defang(bundle["report"]["raw_content"]),
                published_at=bundle["report"]["published_at"],
                source_url=defang(bundle["report"]["source_url"]),
                confidence_score=bundle["report"]["confidence_score"],
            )
            session.add(report)
            await session.commit()
            await session.refresh(report)
            new_reports += 1

        existing_trend = (
            await session.execute(
                select(ThreatTrend).where(ThreatTrend.report_id == report.id)
            )
        ).scalar_one_or_none()
        if existing_trend:
            continue

        summary = bundle["summary"]
        session.add(
            ThreatTrend(
                report_id=report.id,
                title=summary["title"],
                method=summary["method"],
                channel=summary["channel"],
                target_roles_json=summary["target_users"],
                red_flags_json=summary["red_flags"],
                safe_response_json=summary["safe_response"],
                risk_level=bundle["risk_level"],
                ai_summary_json=summary,
            )
        )
        new_trends += 1

    await session.commit()
    return new_reports, new_trends


async def seed_initial_training_and_test(
    session, company: Company, employees
) -> None:
    """Pre-stamp one approved security training + one in-app test so the
    Security Awareness page already has content on first boot.
    """
    existing = (
        await session.execute(
            select(GeneratedTraining).where(GeneratedTraining.company_id == company.id)
        )
    ).scalars().all()
    if existing:
        return

    first_trend = (
        await session.execute(select(ThreatTrend).order_by(ThreatTrend.id))
    ).scalars().first()
    if not first_trend:
        return

    payload = sample_training_for_trend(first_trend.title, first_trend.method)
    training = GeneratedTraining(
        company_id=company.id,
        trend_id=first_trend.id,
        title=payload["title"],
        lesson_json={
            "lesson": payload["lesson"],
            "summary": payload["summary"],
            "redFlags": payload["redFlags"],
            "safeActions": payload["safeActions"],
            "adminNotes": payload["adminNotes"],
            "limitations": payload["limitations"],
        },
        quiz_json=payload["quiz"],
        scenario_json=payload["scenario"],
        status="published",
        approved_at=datetime.now(UTC),
    )
    session.add(training)
    await session.commit()
    await session.refresh(training)

    test = PhishingTest(
        company_id=company.id,
        training_id=training.id,
        title=f"{training.title} — security challenge",
        test_type="in_app",
        scenario_json=payload["scenario"],
        status="active",
    )
    session.add(test)
    await session.commit()
    await session.refresh(test)

    # Pre-record a couple of mixed results so the dashboard isn't empty
    rnd = random.Random(13)
    for emp in employees[:5]:
        if rnd.random() < 0.6:
            answer = payload["scenario"]["correctAnswer"]
            action = "answered_correctly"
            score, risk = 100, "low"
        else:
            risky = [
                o
                for o in payload["scenario"]["options"]
                if o != payload["scenario"]["correctAnswer"]
            ]
            answer = rnd.choice(risky) if risky else ""
            action = "answered_risky"
            score, risk = 40, "high"
        session.add(
            PhishingTestResult(
                test_id=test.id,
                employee_id=emp.id,
                action=action,
                answer=answer,
                score=score,
                risk_level=risk,
                feedback_json={
                    "isCorrect": action == "answered_correctly",
                    "correctAnswer": payload["scenario"]["correctAnswer"],
                    "explanation": payload["scenario"]["explanation"],
                },
            )
        )
    await session.commit()


CANDIDATE_PROFILES = [
    {
        "name": "Ali Karimov",
        "email": "ali.k@example.com",
        "status": "applied",
        "training_progress": 0,
        "ai_interview_score": 0,
        "with_interview": False,
        "with_scorecard": False,
        "answer_quality": "weak",
    },
    {
        "name": "Madina Tursunova",
        "email": "madina.t@example.com",
        "status": "ai_interview_completed",
        "training_progress": 100,
        "ai_interview_score": 82,
        "with_interview": True,
        "with_scorecard": True,
        "answer_quality": "strong",
    },
    {
        "name": "Bekzod Rustamov",
        "email": "bekzod.r@example.com",
        "status": "training_assigned",
        "training_progress": 40,
        "ai_interview_score": 0,
        "with_interview": False,
        "with_scorecard": False,
        "answer_quality": "medium",
    },
]


async def seed_hiring(session, company: Company) -> dict:
    """Seed one role + 3 candidates + interviews + scorecards.

    Idempotent — checks by role title before inserting anything.
    """
    role = (
        await session.execute(
            select(JobRole).where(
                JobRole.company_id == company.id,
                JobRole.title == "Junior Customer Support Specialist",
            )
        )
    ).scalar_one_or_none()
    if not role:
        plan = sample_role_plan(
            title="Junior Customer Support Specialist",
            department="Customer Support",
            seniority="Junior",
            role_description=(
                "We are hiring a Junior Customer Support Specialist. The candidate "
                "should communicate clearly in English and Uzbek, handle angry "
                "customers, understand refund policy, use CRM basics, protect "
                "customer data, identify phishing attempts, and escalate difficult "
                "cases to managers."
            ),
        )
        role = JobRole(
            company_id=company.id,
            title="Junior Customer Support Specialist",
            description=plan["roleProfile"]["summary"],
            department="Customer Support",
            seniority="Junior",
            required_skills_json=plan["requiredSkills"],
            training_map_json=plan["trainingMap"],
            interview_plan_json=plan["interviewPlan"],
            assessment_plan_json=plan["assessmentPlan"],
            rubric_json=plan["rubric"],
            onboarding_plan_json=plan["onboardingPlan"],
            role_profile_json=plan["roleProfile"],
            responsible_ai_notes_json=plan["responsibleAINotes"],
        )
        session.add(role)
        await session.commit()
        await session.refresh(role)

    seeded_candidates: list[Candidate] = []
    rnd = random.Random(7)
    for profile in CANDIDATE_PROFILES:
        existing = (
            await session.execute(
                select(Candidate).where(
                    Candidate.email == profile["email"],
                    Candidate.company_id == company.id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            seeded_candidates.append(existing)
            continue

        cand = Candidate(
            company_id=company.id,
            job_role_id=role.id,
            full_name=profile["name"],
            email=profile["email"],
            status=profile["status"],
            training_progress=profile["training_progress"],
            ai_interview_score=profile["ai_interview_score"],
            readiness_score=profile["ai_interview_score"],
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)
        seeded_candidates.append(cand)

        # Materialise training modules
        training_map = role.training_map_json or []
        for i, item in enumerate(training_map):
            mod = CandidateTrainingModule(
                candidate_id=cand.id,
                job_role_id=role.id,
                title=item.get("title", f"Module {i+1}"),
                description=item.get("description", ""),
                content=item.get("content", ""),
                quiz_json=item.get("quiz", []),
                order_index=i,
                status="not_started",
            )
            # Decide module state from progress
            if profile["training_progress"] >= 100:
                mod.status = "completed"
                mod.score = rnd.randint(72, 96)
                mod.completed_at = datetime.now(UTC) - timedelta(days=rnd.randint(1, 6))
            elif profile["training_progress"] > 0 and i == 0:
                mod.status = "completed"
                mod.score = rnd.randint(65, 85)
                mod.completed_at = datetime.now(UTC) - timedelta(days=rnd.randint(1, 4))
            session.add(mod)
        await session.commit()

        if profile["with_interview"]:
            interview_questions = role.interview_plan_json or []
            transcript: list[dict] = []
            score_log: list[dict] = []
            for q in interview_questions[:5]:
                qtext = q.get("question", "")
                transcript.append(
                    {
                        "role": "interviewer",
                        "text": qtext,
                        "skill_tested": q.get("skillTested", q.get("skill_tested", "")),
                    }
                )
                if profile["answer_quality"] == "strong":
                    answer = (
                        "I would stay calm, refuse any unsafe request, escalate to "
                        "my manager, document the case, and follow the company "
                        "policy. I would never share customer data through "
                        "personal channels and would report suspicious requests "
                        "to security."
                    )
                elif profile["answer_quality"] == "medium":
                    answer = (
                        "I'd try to help the customer and then check with my "
                        "manager if it gets complicated. I would not share "
                        "anything I shouldn't."
                    )
                else:
                    answer = "I think I would just help them quickly to avoid trouble."
                transcript.append({"role": "candidate", "text": answer})
                eval_payload = sample_answer_evaluation(answer, qtext)
                transcript.append(
                    {
                        "role": "feedback",
                        "text": eval_payload.get("hrReviewNote", ""),
                        "score": eval_payload.get("score", 0),
                        "skill_tested": q.get("skillTested", q.get("skill_tested", "")),
                    }
                )
                score_log.append(
                    {
                        "question": qtext,
                        "skill_tested": q.get("skillTested", q.get("skill_tested", "")),
                        "score": eval_payload.get("score", 0),
                        "skill_scores": eval_payload.get("skillScores", []),
                        "strengths": eval_payload.get("strengths", []),
                        "weaknesses": eval_payload.get("weaknesses", []),
                        "red_flags": eval_payload.get("redFlags", []),
                        "better_answer_example": eval_payload.get(
                            "betterAnswerExample", ""
                        ),
                    }
                )
            overall = int(round(sum(s["score"] for s in score_log) / max(1, len(score_log))))
            session.add(
                AIInterview(
                    candidate_id=cand.id,
                    job_role_id=role.id,
                    interview_questions_json=[
                        q.get("question", "") for q in interview_questions[:5]
                    ],
                    transcript_json=transcript,
                    score_json=score_log,
                    overall_score=overall,
                    recommendation=(
                        "invite_to_hr_interview" if overall >= 75 else "needs_more_review"
                    ),
                    status="completed",
                    finished_at=datetime.now(UTC) - timedelta(hours=rnd.randint(1, 36)),
                )
            )
            cand.ai_interview_score = overall
            cand.readiness_score = overall
            await session.commit()
            await session.refresh(cand)

        if profile["with_scorecard"]:
            sc = sample_scorecard(
                candidate={
                    "id": cand.id,
                    "full_name": cand.full_name,
                    "training_progress": cand.training_progress,
                    "ai_interview_score": cand.ai_interview_score,
                    "readiness_score": cand.readiness_score,
                    "role_title": role.title,
                },
                training={"average_score": 80},
                interview={"overall_score": cand.ai_interview_score},
            )
            session.add(
                CandidateScorecard(
                    candidate_id=cand.id,
                    job_role_id=role.id,
                    overall_readiness_score=sc["overallReadinessScore"],
                    strengths_json=sc["strengths"],
                    weaknesses_json=sc["weaknesses"],
                    skill_scores_json=sc["skillScores"],
                    risk_flags_json=sc["riskFlags"],
                    suggested_hr_questions_json=sc["suggestedHRInterviewQuestions"],
                    recommended_next_step=sc["recommendation"],
                    ai_summary=sc["summary"],
                    responsible_ai_note=sc["responsibleAINote"],
                )
            )
            cand.recommendation = sc["recommendation"]
            cand.status = "hr_review"
            cand.readiness_score = sc["overallReadinessScore"]
            await session.commit()

    return {"role_id": role.id, "candidates": [c.id for c in seeded_candidates]}


async def seed_onboarding_os(session, company, admin, employees) -> dict:
    """Seed a template + active onboarding instance for a fresh hire."""
    from datetime import UTC, datetime, timedelta

    from .models import (
        OnbAIRecommendation,
        OnbBuddyCheckIn,
        OnbEmployeeFeedback,
        OnbInstance,
        OnbNotification,
        OnbReview,
        OnbTask,
        OnbTaskFeedback,
        OnbTaskSubmission,
        OnbTemplate,
        OnbTemplateTask,
    )
    from .services.sample_onboarding_os import sample_template_plan

    existing = (
        await session.execute(select(OnbTemplate).where(OnbTemplate.company_id == company.id))
    ).scalars().first()
    if existing:
        return {"template_id": existing.id, "instance_id": None, "tasks": 0}

    plan = sample_template_plan("Junior Backend Developer", "Engineering", 90)
    tpl = OnbTemplate(
        company_id=company.id,
        name=plan["name"],
        role_name=plan["role_name"],
        department=plan["department"],
        duration_days=plan["duration_days"],
        description=plan["description"],
        success_criteria=plan["success_criteria"],
        required_score=plan["required_score"],
        final_approval_required=plan["final_approval_required"],
        created_by_user_id=admin.id,
        ai_generated=False,
    )
    session.add(tpl)
    await session.commit()
    await session.refresh(tpl)
    for t in plan["tasks"]:
        session.add(
            OnbTemplateTask(
                template_id=tpl.id,
                title=t["title"],
                description=t.get("description", ""),
                stage=t.get("stage", "day_1"),
                category=t.get("category", "role_training"),
                default_due_day=t.get("default_due_day", 1),
                default_owner_role=t.get("default_owner_role", "employee"),
                default_reviewer_role=t.get("default_reviewer_role", "hr"),
                approval_required=t.get("approval_required", False),
                feedback_required=t.get("feedback_required", False),
                required_score=t.get("required_score"),
                priority=t.get("priority", "medium"),
                resources_json=t.get("resources", []),
                quiz_json=t.get("quiz"),
                order_index=t.get("order_index", 0),
            )
        )
    await session.commit()

    # Pick canonical actors from the seeded employees roster.
    by_dept = {e.department: e for e in employees}
    learner = by_dept.get("Engineering") or employees[0]
    manager = by_dept.get("Management") or employees[1]
    supervisor = next(
        (e for e in employees if e.department == "Engineering" and e.id != learner.id),
        employees[2],
    )
    buddy = next(
        (e for e in employees if e.department == "Engineering" and e.id not in {learner.id, supervisor.id}),
        employees[3],
    )
    it_owner = next((e for e in employees if e.department == "Operations"), employees[4])

    start = datetime.now(UTC) - timedelta(days=14)
    instance = OnbInstance(
        company_id=company.id,
        employee_id=learner.id,
        template_id=tpl.id,
        role_name=tpl.role_name,
        department=tpl.department,
        start_date=start,
        end_date=start + timedelta(days=tpl.duration_days),
        duration_days=tpl.duration_days,
        manager_id=manager.id,
        supervisor_id=supervisor.id,
        buddy_id=buddy.id,
        it_owner_id=it_owner.id,
        success_criteria=tpl.success_criteria,
        status="in_progress",
        overall_progress=35,
        readiness_score=72,
        risk_level="medium",
    )
    session.add(instance)
    await session.commit()
    await session.refresh(instance)

    # Materialise tasks with realistic mixed states
    reviewer_lookup = {
        "hr": None,
        "manager": manager.id,
        "supervisor": supervisor.id,
        "buddy": buddy.id,
        "it": it_owner.id,
        "employee": learner.id,
    }
    tpl_tasks = (
        await session.execute(
            select(OnbTemplateTask)
            .where(OnbTemplateTask.template_id == tpl.id)
            .order_by(OnbTemplateTask.order_index, OnbTemplateTask.id)
        )
    ).scalars().all()
    rnd = random.Random(7)
    created_tasks = []
    for tt in tpl_tasks:
        due = start + timedelta(days=tt.default_due_day)
        # State pattern: preboarding+day_1+week_1 mostly completed, day_30 partly,
        # day_60+ not started.
        if tt.stage in {"preboarding", "day_1"}:
            status_ = "approved" if tt.approval_required else "completed"
            score = rnd.randint(75, 95) if tt.required_score else None
            completed_at = start + timedelta(days=tt.default_due_day + 1)
        elif tt.stage == "week_1":
            status_ = rnd.choice(["approved", "completed", "needs_improvement"])
            score = rnd.randint(70, 90) if tt.required_score else None
            completed_at = (
                start + timedelta(days=tt.default_due_day) if status_ != "needs_improvement" else None
            )
        elif tt.stage == "day_30":
            status_ = rnd.choice(["submitted", "in_progress", "approved"])
            score = rnd.randint(60, 85) if status_ == "approved" and tt.required_score else None
            completed_at = None
        else:
            status_ = "not_started"
            score = None
            completed_at = None

        t = OnbTask(
            instance_id=instance.id,
            template_task_id=tt.id,
            title=tt.title,
            description=tt.description,
            stage=tt.stage,
            category=tt.category,
            assigned_by_user_id=admin.id,
            assigned_by_role=tt.default_reviewer_role or "hr",
            assigned_to_employee_id=learner.id,
            reviewer_employee_id=reviewer_lookup.get(tt.default_reviewer_role),
            reviewer_role=tt.default_reviewer_role,
            due_date=due,
            priority=tt.priority,
            approval_required=tt.approval_required,
            feedback_required=tt.feedback_required,
            required_score=tt.required_score,
            score=score,
            resources_json=tt.resources_json or [],
            quiz_json=tt.quiz_json,
            status=status_,
            completed_at=completed_at,
            submitted_at=completed_at if status_ in {"submitted", "approved", "completed"} else None,
            reviewed_at=completed_at if status_ in {"approved", "needs_improvement", "failed"} else None,
            assignment_history_json=[
                {
                    "actor_user_id": admin.id,
                    "actor_role": "hr",
                    "action": "created_from_template",
                    "at": start.isoformat(),
                }
            ],
        )
        session.add(t)
        created_tasks.append(t)
    await session.commit()
    for t in created_tasks:
        await session.refresh(t)

    # A representative supervisor feedback + a 30-day review
    submitted_practical = next(
        (t for t in created_tasks if t.category == "practical" and t.status in {"submitted", "approved"}),
        None,
    )
    if submitted_practical:
        session.add(
            OnbTaskSubmission(
                task_id=submitted_practical.id,
                employee_id=learner.id,
                submission_text="PR #134 — refactors the refund worker, adds tests, opens a follow-up ticket for retry semantics.",
                attachment_url="https://example.com/pr/134",
            )
        )
        session.add(
            OnbTaskFeedback(
                task_id=submitted_practical.id,
                instance_id=instance.id,
                from_user_id=admin.id,
                from_role="supervisor",
                to_employee_id=learner.id,
                rating=4,
                score=80,
                strengths="Clean diff, good test coverage, raised the right follow-up.",
                weaknesses="Commit messages were terse — please use the team Conventional Commits format.",
                comment="Approved with a nit on commit hygiene.",
                decision="approved",
                rubric_scores_json={
                    "code_quality": 4,
                    "git_workflow": 3,
                    "communication": 4,
                    "process": 4,
                },
            )
        )

    session.add(
        OnbReview(
            instance_id=instance.id,
            review_type="30_day",
            reviewer_user_id=admin.id,
            reviewer_employee_id=manager.id,
            role_clarity_score=4,
            workflow_score=3,
            communication_score=4,
            ownership_score=4,
            productivity_score=3,
            culture_score=5,
            strengths="Asks great questions; pairs well with the team.",
            weaknesses="Still ramping on deploy pipeline.",
            next_goals="Ship two more medium tickets unaided by day 60.",
            decision="pass",
        )
    )
    session.add(
        OnbBuddyCheckIn(
            instance_id=instance.id,
            buddy_employee_id=buddy.id,
            employee_id=learner.id,
            culture_score=4,
            connection_score=4,
            comment="Fits in well, contributes in standups, asks early when blocked.",
        )
    )
    session.add(
        OnbEmployeeFeedback(
            instance_id=instance.id,
            employee_id=learner.id,
            confidence_score=3,
            clarity_score=4,
            support_score=4,
            comment="Onboarding has been clear; would like a deeper deploy-pipeline walkthrough.",
            blockers="Deploy pipeline access still patchy in week 2.",
        )
    )
    session.add(
        OnbAIRecommendation(
            instance_id=instance.id,
            risk_level="medium",
            reason="One task in needs_improvement and one overdue compliance follow-up.",
            recommended_action="Pair the new hire with the supervisor on the next practical ticket and re-run the security quiz.",
            recommended_training=["Security policy walkthrough", "Practical pairing session"],
            notify_roles=["HR", "Manager"],
            payload_json={"source": "seed"},
        )
    )
    session.add(
        OnbNotification(
            company_id=company.id,
            user_id=admin.id,
            title=f"Medium-risk onboarding: {learner.name}",
            message="One task in needs_improvement; recommend manager check-in.",
            type="high_risk_detected",
            target_url=f"/admin/onboarding-os/instances/{instance.id}",
        )
    )
    await session.commit()
    return {
        "template_id": tpl.id,
        "instance_id": instance.id,
        "tasks": len(created_tasks),
    }


# ---------------------------------------------------------------------------
# Optional enrichment — extra hiring roles, OS instances, phishing tests and
# scenario attempts so every dashboard renders with realistic volume.
#
# Idempotent: each insert checks a unique-ish key before adding. Safe to
# re-run after the base seed.
# ---------------------------------------------------------------------------
async def seed_extras(session, company, admin, employees, courses) -> dict:
    from datetime import UTC, datetime, timedelta

    from .models import (
        Candidate,
        CandidateScorecard,
        CandidateTrainingModule,
        GeneratedTraining,
        JobRole,
        OnbBuddyCheckIn,
        OnbEmployeeFeedback,
        OnbInstance,
        OnbReview,
        OnbTask,
        OnbTaskFeedback,
        OnbTemplate,
        OnbTemplateTask,
        PhishingTest,
        PhishingTestResult,
        Scenario,
        ScenarioAttempt,
        ThreatTrend,
    )
    from .services.sample_onboarding_os import sample_template_plan

    rnd = random.Random(2026)
    summary: dict[str, int] = {
        "extra_roles": 0,
        "extra_candidates": 0,
        "extra_templates": 0,
        "extra_instances": 0,
        "extra_phishing_results": 0,
        "scenario_attempts": 0,
        "buddy_checkins": 0,
        "employee_feedback": 0,
    }

    # -----------------------------------------------------------------------
    # 1. Extra hiring roles + candidates
    # -----------------------------------------------------------------------
    EXTRA_ROLES = [
        {
            "title": "Junior Backend Developer",
            "department": "Engineering",
            "seniority": "Junior",
            "description": (
                "Ships small backend tickets end-to-end, pairs with seniors, "
                "handles on-call rotation in 6 months."
            ),
        },
        {
            "title": "Marketing Specialist",
            "department": "Marketing",
            "seniority": "Mid",
            "description": (
                "Owns content calendar, runs email campaigns, partners with "
                "Sales on lead-gen materials."
            ),
        },
    ]
    role_records: dict[str, JobRole] = {}
    for cfg in EXTRA_ROLES:
        existing = (
            await session.execute(
                select(JobRole).where(
                    JobRole.company_id == company.id, JobRole.title == cfg["title"]
                )
            )
        ).scalar_one_or_none()
        if existing:
            role_records[cfg["title"]] = existing
            continue
        role = JobRole(
            company_id=company.id,
            title=cfg["title"],
            description=cfg["description"],
            department=cfg["department"],
            seniority=cfg["seniority"],
            required_skills_json=[
                {"name": "Communication", "category": "communication", "importance": "high"},
                {"name": "Ownership", "category": "culture", "importance": "high"},
                {"name": "Policy understanding", "category": "policy", "importance": "medium"},
            ],
            training_map_json=[],
            interview_plan_json=[],
            assessment_plan_json=[],
            rubric_json={"categories": [], "passingScore": 70},
            onboarding_plan_json=[],
            role_profile_json={
                "title": cfg["title"],
                "department": cfg["department"],
                "seniority": cfg["seniority"],
                "summary": cfg["description"],
                "idealCandidate": "Owns problems end-to-end; communicates risk early; follows policy by default.",
                "successOutcomes": ["Ships unblocked", "No compliance issues", "Positive 30/60/90 review"],
            },
            responsible_ai_notes_json=[
                "AI never makes final hiring decisions; recommendations support HR review only.",
                "No protected-attribute scoring.",
            ],
        )
        session.add(role)
        await session.commit()
        await session.refresh(role)
        role_records[cfg["title"]] = role
        summary["extra_roles"] += 1

    # Build a lookup including the original Junior Customer Support role
    cs_role = (
        await session.execute(
            select(JobRole).where(
                JobRole.company_id == company.id,
                JobRole.title.ilike("%Customer Support%"),
            )
        )
    ).scalar_one_or_none()

    EXTRA_CANDIDATES = [
        # (full_name, email, role_title, status, training_progress,
        #  ai_interview_score, assessment_score, readiness_score, recommendation)
        ("Aziz Khan", "aziz.khan@candidates.example", "Junior Backend Developer",
         "training_completed", 100, 0, 0, 0, ""),
        ("Nodira Karimova", "nodira.k@candidates.example", "Junior Backend Developer",
         "ai_interview_completed", 100, 82, 0, 80, "invite_to_hr_interview"),
        ("Sherzod Rakhmonov", "sherzod.r@candidates.example", "Marketing Specialist",
         "hr_review", 100, 78, 70, 76, "invite_to_hr_interview"),
        ("Zarina Akhmedova", "zarina.a@candidates.example", "Marketing Specialist",
         "applied", 0, 0, 0, 0, ""),
        ("Otabek Boltayev", "otabek.b@candidates.example", "Junior Customer Support Specialist",
         "rejected", 60, 40, 0, 42, "not_ready"),
    ]
    for (
        name,
        email,
        role_title,
        status_,
        progress,
        ai_score,
        assess,
        readiness,
        rec,
    ) in EXTRA_CANDIDATES:
        existing = (
            await session.execute(
                select(Candidate).where(
                    Candidate.company_id == company.id, Candidate.email == email
                )
            )
        ).scalar_one_or_none()
        if existing:
            continue
        role = role_records.get(role_title) or cs_role
        if not role:
            continue
        cand = Candidate(
            company_id=company.id,
            job_role_id=role.id,
            full_name=name,
            email=email,
            status=status_,
            training_progress=progress,
            ai_interview_score=ai_score,
            assessment_score=assess,
            readiness_score=readiness,
            recommendation=rec,
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)
        summary["extra_candidates"] += 1

        # If past the interview, drop in a scorecard so the candidate
        # detail page is fully populated.
        if status_ in {"ai_interview_completed", "hr_review", "hr_interview"}:
            session.add(
                CandidateScorecard(
                    candidate_id=cand.id,
                    job_role_id=role.id,
                    strengths_json=[
                        "Clear, structured communication",
                        "Asks clarifying questions before acting",
                    ],
                    weaknesses_json=[
                        "Needs more practice with our refund process",
                    ],
                    skill_scores_json=[
                        {"skill": "Communication", "score": 82, "reason": "Confident, calm tone."},
                        {"skill": "Policy awareness", "score": 75, "reason": "Knew escalation rules."},
                    ],
                    risk_flags_json=[],
                    suggested_hr_questions_json=[
                        "Walk me through a time you escalated a tough decision.",
                        "How do you handle a colleague asking you to bypass policy?",
                    ],
                    recommended_next_step=rec or "invite_to_hr_interview",
                    ai_summary=(
                        "Strong communication + policy awareness; ready for HR interview. "
                        "AI recommendation only — HR makes the final decision."
                    ),
                )
            )
            await session.commit()

    # -----------------------------------------------------------------------
    # 2. Extra Onboarding OS templates + 2 more instances at varied stages
    # -----------------------------------------------------------------------
    EXTRA_TEMPLATES = [
        ("Customer Support Onboarding", "Customer Support", 60),
        ("Marketing Onboarding", "Marketing", 45),
    ]
    tpl_records: dict[str, OnbTemplate] = {}
    for name, dept, days in EXTRA_TEMPLATES:
        existing = (
            await session.execute(
                select(OnbTemplate).where(
                    OnbTemplate.company_id == company.id, OnbTemplate.name == name
                )
            )
        ).scalar_one_or_none()
        if existing:
            tpl_records[name] = existing
            continue
        plan = sample_template_plan(dept, dept, days)
        tpl = OnbTemplate(
            company_id=company.id,
            name=name,
            role_name=dept,
            department=dept,
            duration_days=days,
            description=plan["description"],
            success_criteria=plan["success_criteria"],
            required_score=70,
            final_approval_required=True,
            created_by_user_id=admin.id,
            ai_generated=False,
        )
        session.add(tpl)
        await session.commit()
        await session.refresh(tpl)
        for t in plan["tasks"]:
            session.add(
                OnbTemplateTask(
                    template_id=tpl.id,
                    title=t["title"],
                    description=t.get("description", ""),
                    stage=t.get("stage", "day_1"),
                    category=t.get("category", "role_training"),
                    default_due_day=t.get("default_due_day", 1),
                    default_owner_role=t.get("default_owner_role", "employee"),
                    default_reviewer_role=t.get("default_reviewer_role", "hr"),
                    approval_required=t.get("approval_required", False),
                    feedback_required=t.get("feedback_required", False),
                    required_score=t.get("required_score"),
                    priority=t.get("priority", "medium"),
                    resources_json=t.get("resources", []),
                    quiz_json=t.get("quiz"),
                    order_index=t.get("order_index", 0),
                )
            )
        await session.commit()
        tpl_records[name] = tpl
        summary["extra_templates"] += 1

    # Build candidate instances. Reuse two existing employees as the
    # "new hires" — one well into onboarding, one nearly done.
    extra_hires = [
        # (employee_dept, template_name, start_offset_days, target_status,
        #  progress, risk, manager_dept, supervisor_dept, buddy_dept)
        ("Sales", "Customer Support Onboarding", 35, "in_progress", 60, "low",
         "Sales", "Sales", "Sales"),
        ("HR", "Marketing Onboarding", 55, "in_progress", 88, "low",
         "Management", "Management", "HR"),
    ]
    now = datetime.now(UTC)
    used_employee_ids: set[int] = {
        i.employee_id
        for i in (
            await session.execute(
                select(OnbInstance).where(OnbInstance.company_id == company.id)
            )
        ).scalars()
    }
    for (
        emp_dept,
        tpl_name,
        start_offset,
        status_,
        progress,
        risk,
        mgr_dept,
        sup_dept,
        buddy_dept,
    ) in extra_hires:
        tpl = tpl_records.get(tpl_name)
        if not tpl:
            continue
        candidate_emp = next(
            (e for e in employees if e.department == emp_dept and e.id not in used_employee_ids),
            None,
        )
        if not candidate_emp:
            continue
        used_employee_ids.add(candidate_emp.id)
        manager = next((e for e in employees if e.department == mgr_dept and e.id != candidate_emp.id), employees[0])
        supervisor = next(
            (
                e for e in employees
                if e.department == sup_dept and e.id not in {candidate_emp.id, manager.id}
            ),
            employees[1],
        )
        buddy = next(
            (
                e for e in employees
                if e.department == buddy_dept and e.id not in {candidate_emp.id, manager.id, supervisor.id}
            ),
            employees[2],
        )
        start = now - timedelta(days=start_offset)
        instance = OnbInstance(
            company_id=company.id,
            employee_id=candidate_emp.id,
            template_id=tpl.id,
            role_name=tpl.role_name,
            department=tpl.department,
            start_date=start,
            end_date=start + timedelta(days=tpl.duration_days),
            duration_days=tpl.duration_days,
            manager_id=manager.id,
            supervisor_id=supervisor.id,
            buddy_id=buddy.id,
            it_owner_id=None,
            status=status_,
            overall_progress=progress,
            readiness_score=max(60, progress - 5),
            risk_level=risk,
        )
        session.add(instance)
        await session.commit()
        await session.refresh(instance)

        # Clone tasks with progress that matches the offset.
        tpl_tasks = (
            await session.execute(
                select(OnbTemplateTask)
                .where(OnbTemplateTask.template_id == tpl.id)
                .order_by(OnbTemplateTask.order_index, OnbTemplateTask.id)
            )
        ).scalars().all()
        reviewer_lookup = {
            "hr": None,
            "manager": manager.id,
            "supervisor": supervisor.id,
            "buddy": buddy.id,
            "it": None,
            "employee": candidate_emp.id,
        }
        for tt in tpl_tasks:
            due = start + timedelta(days=tt.default_due_day)
            elapsed_days = (now - start).days
            # All tasks whose due-day is at least 5 days in the past get marked
            # completed; the rest split between in_progress / not_started.
            if tt.default_due_day < elapsed_days - 3:
                task_status, completed_at, score = (
                    "approved" if tt.approval_required else "completed",
                    due + timedelta(days=1),
                    rnd.randint(75, 95) if tt.required_score else None,
                )
            elif tt.default_due_day <= elapsed_days + 7:
                task_status, completed_at, score = "in_progress", None, None
            else:
                task_status, completed_at, score = "not_started", None, None

            session.add(
                OnbTask(
                    instance_id=instance.id,
                    template_task_id=tt.id,
                    title=tt.title,
                    description=tt.description,
                    stage=tt.stage,
                    category=tt.category,
                    assigned_by_user_id=admin.id,
                    assigned_by_role=tt.default_reviewer_role or "hr",
                    assigned_to_employee_id=candidate_emp.id,
                    reviewer_employee_id=reviewer_lookup.get(tt.default_reviewer_role),
                    reviewer_role=tt.default_reviewer_role,
                    due_date=due,
                    priority=tt.priority,
                    approval_required=tt.approval_required,
                    feedback_required=tt.feedback_required,
                    required_score=tt.required_score,
                    score=score,
                    resources_json=tt.resources_json or [],
                    quiz_json=tt.quiz_json,
                    status=task_status,
                    completed_at=completed_at,
                    submitted_at=completed_at,
                    reviewed_at=completed_at,
                    assignment_history_json=[
                        {
                            "actor_user_id": admin.id,
                            "actor_role": "hr",
                            "action": "created_from_template",
                            "at": start.isoformat(),
                        }
                    ],
                )
            )
        await session.commit()

        # Manager 30-day review for the more-advanced instance
        if start_offset >= 35:
            session.add(
                OnbReview(
                    instance_id=instance.id,
                    review_type="30_day",
                    reviewer_user_id=admin.id,
                    reviewer_employee_id=manager.id,
                    role_clarity_score=4,
                    workflow_score=4,
                    communication_score=4,
                    ownership_score=4,
                    productivity_score=4,
                    culture_score=5,
                    strengths="Quick learner, asks the right questions, follows process.",
                    weaknesses="Wants more time to learn the CRM ticket flow.",
                    next_goals="Handle 5 tier-1 tickets unaided by day 45.",
                    decision="pass",
                )
            )
        if start_offset >= 55:
            session.add(
                OnbReview(
                    instance_id=instance.id,
                    review_type="60_day",
                    reviewer_user_id=admin.id,
                    reviewer_employee_id=manager.id,
                    role_clarity_score=5,
                    workflow_score=4,
                    communication_score=5,
                    ownership_score=4,
                    productivity_score=4,
                    culture_score=5,
                    strengths="Owns campaigns end-to-end, partners well with Sales.",
                    weaknesses="Could push back earlier on unrealistic timelines.",
                    next_goals="Lead next product launch comms.",
                    decision="pass",
                )
            )
        session.add(
            OnbBuddyCheckIn(
                instance_id=instance.id,
                buddy_employee_id=buddy.id,
                employee_id=candidate_emp.id,
                culture_score=rnd.randint(4, 5),
                connection_score=rnd.randint(4, 5),
                comment=rnd.choice(
                    [
                        "Settling in well, makes the team Friday demo every week.",
                        "Asks for help proactively — no signs of burnout.",
                        "Great fit on the team; helping out with peer questions already.",
                    ]
                ),
            )
        )
        summary["buddy_checkins"] += 1
        session.add(
            OnbEmployeeFeedback(
                instance_id=instance.id,
                employee_id=candidate_emp.id,
                confidence_score=rnd.randint(3, 5),
                clarity_score=rnd.randint(3, 5),
                support_score=rnd.randint(4, 5),
                comment=rnd.choice(
                    [
                        "Process feels clear; would like more shadowing on tough tickets.",
                        "Buddy + manager check-ins are very useful.",
                        "Onboarding has been smooth — just need access to the analytics tool.",
                    ]
                ),
                blockers=rnd.choice(["", "Tool access lagging by 2 days", ""]),
            )
        )
        summary["employee_feedback"] += 1
        await session.commit()
        summary["extra_instances"] += 1

    # -----------------------------------------------------------------------
    # 3. Extra phishing test + spread results across employees
    # -----------------------------------------------------------------------
    second_training = (
        await session.execute(
            select(GeneratedTraining)
            .where(GeneratedTraining.company_id == company.id)
            .order_by(GeneratedTraining.id.desc())
        )
    ).scalars().first()
    # If only the one auto-seeded training exists, mint a second from a
    # different trend so the dashboard's "weakest methods" splits across two.
    if second_training:
        trends = (
            await session.execute(select(ThreatTrend).order_by(ThreatTrend.id))
        ).scalars().all()
        # Pick the second trend if available
        target_trend = trends[1] if len(trends) > 1 else trends[0] if trends else None
        if target_trend:
            already = (
                await session.execute(
                    select(PhishingTest).where(
                        PhishingTest.company_id == company.id,
                        PhishingTest.title.like("%Smishing%"),
                    )
                )
            ).scalar_one_or_none()
            if not already:
                # Mint a sibling training from the second trend
                from .services.sample_threats import sample_training_for_trend

                payload = sample_training_for_trend(target_trend.title, target_trend.method)
                second_training = GeneratedTraining(
                    company_id=company.id,
                    trend_id=target_trend.id,
                    title=payload["title"],
                    lesson_json={
                        "lesson": payload["lesson"],
                        "summary": payload["summary"],
                        "redFlags": payload["redFlags"],
                        "safeActions": payload["safeActions"],
                        "adminNotes": payload["adminNotes"],
                        "limitations": payload["limitations"],
                    },
                    quiz_json=payload["quiz"],
                    scenario_json=payload["scenario"],
                    status="published",
                    approved_at=now,
                )
                session.add(second_training)
                await session.commit()
                await session.refresh(second_training)
                second_test = PhishingTest(
                    company_id=company.id,
                    training_id=second_training.id,
                    title=f"{target_trend.method} — security challenge",
                    test_type="in_app",
                    scenario_json=payload["scenario"],
                    status="active",
                )
                session.add(second_test)
                await session.commit()
                await session.refresh(second_test)
                # Spread 8 results across distinct employees with a mix of
                # correct / risky / reported outcomes
                ph_rnd = random.Random(99)
                pool = list(employees)
                ph_rnd.shuffle(pool)
                for emp in pool[:8]:
                    roll = ph_rnd.random()
                    if roll < 0.55:
                        action, answer, score, risk = (
                            "answered_correctly",
                            payload["scenario"]["correctAnswer"],
                            100,
                            "low",
                        )
                    elif roll < 0.85:
                        risky = [
                            o
                            for o in payload["scenario"]["options"]
                            if o != payload["scenario"]["correctAnswer"]
                        ]
                        action, answer, score, risk = (
                            "answered_risky",
                            ph_rnd.choice(risky) if risky else "",
                            40,
                            "high",
                        )
                    else:
                        action, answer, score, risk = ("reported", "(reported as suspicious)", 80, "low")
                    session.add(
                        PhishingTestResult(
                            test_id=second_test.id,
                            employee_id=emp.id,
                            action=action,
                            answer=answer,
                            score=score,
                            risk_level=risk,
                            feedback_json={
                                "isCorrect": action == "answered_correctly",
                                "correctAnswer": payload["scenario"]["correctAnswer"],
                                "explanation": payload["scenario"]["explanation"],
                            },
                        )
                    )
                    summary["extra_phishing_results"] += 1
                await session.commit()

    # -----------------------------------------------------------------------
    # 4. Scenario attempts — populates the AdminDashboard's weakest topics
    # -----------------------------------------------------------------------
    existing_attempts = (
        await session.execute(select(ScenarioAttempt).limit(1))
    ).scalar_one_or_none()
    if not existing_attempts:
        scenarios = (await session.execute(select(Scenario))).scalars().all()
        if scenarios and courses:
            sc_rnd = random.Random(11)
            for _ in range(30):
                sc = sc_rnd.choice(scenarios)
                emp = sc_rnd.choice(employees)
                # Course id has to match the scenario's course
                score = sc_rnd.randint(35, 95)
                risk = "low" if score >= 80 else "medium" if score >= 60 else "high"
                session.add(
                    ScenarioAttempt(
                        employee_id=emp.id,
                        course_id=sc.course_id,
                        scenario_id=sc.id,
                        user_answer="(seed) The right move is to refuse, verify through approved channel, and report.",
                        ai_feedback_json={
                            "isCorrect": score >= 60,
                            "score": score,
                            "riskLevel": risk,
                            "feedback": "Generated during demo seeding.",
                        },
                        score=score,
                        risk_level=risk,
                    )
                )
                summary["scenario_attempts"] += 1
            await session.commit()

    return summary


async def seed_buddy_it_extras(session, company, admin) -> dict:
    """Add a blocked IT task on one instance, two help requests, and
    targeted notifications so Buddy + IT dashboards land populated."""
    from datetime import UTC, datetime, timedelta

    from .models import (
        OnbHelpRequest,
        OnbInstance,
        OnbNotification,
        OnbTask,
    )

    summary = {"help_requests": 0, "blocked_it_task": 0, "notifications": 0}
    instances = (
        await session.execute(
            select(OnbInstance).where(OnbInstance.company_id == company.id)
        )
    ).scalars().all()
    if not instances:
        return summary

    # 1. Block one IT task on the first instance to surface in IT dashboard.
    first = instances[0]
    it_task = (
        await session.execute(
            select(OnbTask).where(
                OnbTask.instance_id == first.id,
                OnbTask.category == "it_setup",
            )
        )
    ).scalars().first()
    if it_task and it_task.status not in {"blocked"}:
        already_blocked = any(
            h.get("action") == "blocked"
            for h in (it_task.assignment_history_json or [])
        )
        if not already_blocked:
            it_task.status = "blocked"
            it_task.assignment_history_json = list(it_task.assignment_history_json or []) + [
                {
                    "actor_user_id": admin.id,
                    "actor_role": "it",
                    "action": "blocked",
                    "reason": "VPN client install fails on M-series Mac — waiting on vendor patch.",
                    "at": datetime.now(UTC).isoformat(),
                }
            ]
            summary["blocked_it_task"] = 1

    # 2. Two help requests — one to buddy, one to IT.
    for inst, target_role, message, priority in [
        (
            instances[0],
            "buddy",
            "Could we book a 15-min sync on deploy pipeline? Still uncertain about hotfix flow.",
            "medium",
        ),
        (
            instances[0],
            "it",
            "VPN keeps disconnecting after a few minutes — same as the team's earlier ticket.",
            "high",
        ),
    ]:
        existing = (
            await session.execute(
                select(OnbHelpRequest).where(
                    OnbHelpRequest.instance_id == inst.id,
                    OnbHelpRequest.target_role == target_role,
                    OnbHelpRequest.message == message,
                )
            )
        ).scalar_one_or_none()
        if existing:
            continue
        session.add(
            OnbHelpRequest(
                instance_id=inst.id,
                employee_id=inst.employee_id,
                target_role=target_role,
                message=message,
                priority=priority,
            )
        )
        summary["help_requests"] += 1

    # 3. Some role-targeted notifications so the bell icon isn't empty.
    bell_seeded = (
        await session.execute(
            select(OnbNotification).where(
                OnbNotification.company_id == company.id,
                OnbNotification.title.like("Buddy: check-in due%"),
            )
        )
    ).scalar_one_or_none()
    if not bell_seeded:
        for inst in instances:
            if inst.buddy_id:
                session.add(
                    OnbNotification(
                        company_id=company.id,
                        employee_id=inst.buddy_id,
                        title=f"Buddy: check-in due — instance #{inst.id}",
                        message="It's been a week since your last check-in. Drop a quick note when you have a minute.",
                        type="task_due_soon",
                        target_url="/buddy/check-ins/new",
                    )
                )
                summary["notifications"] += 1
            if inst.it_owner_id:
                session.add(
                    OnbNotification(
                        company_id=company.id,
                        employee_id=inst.it_owner_id,
                        title=f"IT: setup checklist update needed — instance #{inst.id}",
                        message="One task is blocked. Please add a status note today.",
                        type="task_overdue",
                        target_url="/it/tasks/blocked",
                    )
                )
                summary["notifications"] += 1

    await session.commit()
    return summary


async def main(reset: bool = False) -> None:
    # Ensure tables exist (no-op if Alembic has already run them)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with local_session() as session:
        if reset:
            print("⚠️  Resetting ELOT tables...")
            await reset_elot_tables(session)

        company = await get_or_create_company(session)
        print(f"✅ Company: {company.name} (id={company.id})")

        admin = await seed_admin_user(session, company)
        print(f"✅ Admin user: {admin.email}")

        employees = await seed_employees(session, company)
        print(f"✅ Employees: {len(employees)}")

        policy = await seed_policy(session, company)
        print(f"✅ Policy: {policy.title}")

        courses = await seed_courses(session, company, policy)
        print(f"✅ Courses: {len(courses)}")

        await seed_assignments(session, company, employees, courses)
        print("✅ Assignments + Certificates seeded")

        new_reports, new_trends = await seed_threats(session)
        print(
            f"✅ Threat intel seeded — {new_reports} new reports, {new_trends} new trends"
        )

        await seed_initial_training_and_test(session, company, employees)
        print("✅ Initial security training + in-app phishing test seeded")

        hiring_info = await seed_hiring(session, company)
        print(
            f"✅ Hiring seeded — role #{hiring_info['role_id']}, "
            f"{len(hiring_info['candidates'])} candidates"
        )

        os_info = await seed_onboarding_os(session, company, admin, employees)
        if os_info.get("instance_id"):
            print(
                f"✅ Onboarding OS seeded — template #{os_info['template_id']}, "
                f"instance #{os_info['instance_id']}, {os_info['tasks']} tasks"
            )
        else:
            print(f"✅ Onboarding OS template already present (#{os_info['template_id']})")

        extras = await seed_extras(session, company, admin, employees, courses)
        added = ", ".join(f"{v} {k.replace('_', ' ')}" for k, v in extras.items() if v)
        if added:
            print(f"✅ Extras seeded — {added}")
        else:
            print("✅ Extras already present (nothing added)")

        buddy_it = await seed_buddy_it_extras(session, company, admin)
        bit = ", ".join(f"{v} {k.replace('_', ' ')}" for k, v in buddy_it.items() if v)
        if bit:
            print(f"✅ Buddy/IT extras seeded — {bit}")
        else:
            print("✅ Buddy/IT extras already present")

        # Convenience demo snapshot
        snapshot = {
            "company_id": company.id,
            "admin_email": admin.email,
            "employee_count": len(employees),
            "course_count": len(courses),
        }
        out = Path(__file__).parent / "seed_snapshot.json"
        out.write_text(json.dumps(snapshot, indent=2, default=str))
        print(f"\n📄 Demo snapshot written to {out}")
        print("\n🎉 Seeding complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed ELOT AI demo data")
    parser.add_argument("--reset", action="store_true", help="Drop ELOT rows before reseeding")
    args = parser.parse_args()
    asyncio.run(main(reset=args.reset))
