"""Candidate-facing endpoints: dashboard, modules, AI interview chat."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    AIInterview,
    Candidate,
    CandidateQuizAttempt,
    CandidateTrainingModule,
    ElotUser,
    JobRole,
)
from ....schemas.hiring import (
    CandidateDashboard,
    CandidateModuleRead,
    CandidateQuizResult,
    CandidateQuizSubmission,
    CandidateRead,
    GenericMessage,
    InterviewSummary,
    JobRoleRead,
    StartInterviewResponse,
    SubmitInterviewAnswer,
    SubmitInterviewAnswerResponse,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_candidate

portal_router = APIRouter(prefix="/candidate", tags=["candidate-portal"])
interview_router = APIRouter(prefix="/candidates", tags=["ai-interview"])


# ---------- Helpers ----------
async def _refresh_progress(db: AsyncSession, cand: Candidate) -> None:
    modules = (
        await db.execute(
            select(CandidateTrainingModule).where(
                CandidateTrainingModule.candidate_id == cand.id
            )
        )
    ).scalars().all()
    if not modules:
        cand.training_progress = 0
        return
    done = sum(1 for m in modules if m.status == "completed")
    cand.training_progress = int(round(done / len(modules) * 100))
    if done == len(modules) and cand.status in ("training_assigned", "applied"):
        cand.status = "training_completed"


# ---------- Candidate dashboard ----------
@portal_router.get("/dashboard", response_model=CandidateDashboard)
async def candidate_dashboard(
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateDashboard:
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role for candidate not found")
    modules = (
        await db.execute(
            select(CandidateTrainingModule)
            .where(CandidateTrainingModule.candidate_id == cand.id)
            .order_by(CandidateTrainingModule.order_index)
        )
    ).scalars().all()
    interview = (
        await db.execute(
            select(AIInterview)
            .where(AIInterview.candidate_id == cand.id)
            .order_by(AIInterview.id.desc())
        )
    ).scalar_one_or_none()

    ai_status = (
        interview.status
        if interview
        else "not_started"
    )
    ai_q_count = (
        len([t for t in (interview.transcript_json or []) if t.get("role") == "interviewer"])
        if interview
        else 0
    )

    # Decide next action
    not_done_module = next((m for m in modules if m.status != "completed"), None)
    if not modules:
        next_action = "Ask HR to assign training"
    elif not_done_module:
        next_action = f"Continue training: {not_done_module.title}"
    elif ai_status != "completed":
        next_action = "Start the AI interview"
    else:
        next_action = "HR is reviewing your results — you'll hear from us soon"

    cand_out = CandidateRead.model_validate(cand)
    cand_out.role_title = role.title

    return CandidateDashboard(
        candidate=cand_out,
        role=JobRoleRead.model_validate(role),
        modules=[CandidateModuleRead.model_validate(m) for m in modules],
        ai_interview_status=ai_status,
        ai_interview_question_count=ai_q_count,
        next_action=next_action,
    )


# ---------- Modules ----------
@portal_router.get("/modules", response_model=list[CandidateModuleRead])
async def list_modules(
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[CandidateModuleRead]:
    rows = (
        await db.execute(
            select(CandidateTrainingModule)
            .where(CandidateTrainingModule.candidate_id == cand.id)
            .order_by(CandidateTrainingModule.order_index)
        )
    ).scalars().all()
    return [CandidateModuleRead.model_validate(m) for m in rows]


@portal_router.get("/modules/{module_id}", response_model=CandidateModuleRead)
async def get_module(
    module_id: int,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateModuleRead:
    m = (
        await db.execute(
            select(CandidateTrainingModule).where(
                CandidateTrainingModule.id == module_id,
                CandidateTrainingModule.candidate_id == cand.id,
            )
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    if m.status == "not_started":
        m.status = "in_progress"
        await db.commit()
        await db.refresh(m)
    return CandidateModuleRead.model_validate(m)


@portal_router.post("/modules/{module_id}/quiz", response_model=CandidateQuizResult)
async def submit_module_quiz(
    module_id: int,
    payload: CandidateQuizSubmission,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateQuizResult:
    m = (
        await db.execute(
            select(CandidateTrainingModule).where(
                CandidateTrainingModule.id == module_id,
                CandidateTrainingModule.candidate_id == cand.id,
            )
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")

    quiz = m.quiz_json or []
    feedback: list[dict] = []
    correct = 0
    total = len(quiz)
    for i, q in enumerate(quiz):
        ans = payload.answers[i] if i < len(payload.answers) else ""
        is_correct = ans == q.get("correctAnswer") or ans == q.get("correct_answer")
        if is_correct:
            correct += 1
        feedback.append(
            {
                "question": q.get("question", ""),
                "your_answer": ans,
                "correct_answer": q.get("correctAnswer", q.get("correct_answer", "")),
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )
    score = int(round((correct / total) * 100)) if total else 0

    db.add(
        CandidateQuizAttempt(
            candidate_id=cand.id,
            module_id=m.id,
            answers_json=payload.answers,
            score=score,
            feedback_json={"feedback": feedback},
        )
    )
    m.status = "completed"
    m.score = score
    m.completed_at = datetime.now(UTC)
    await _refresh_progress(db, cand)
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    return CandidateQuizResult(
        score=score, correct=correct, total=total, feedback=feedback
    )


@portal_router.post("/modules/{module_id}/complete", response_model=CandidateModuleRead)
async def mark_module_complete(
    module_id: int,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateModuleRead:
    m = (
        await db.execute(
            select(CandidateTrainingModule).where(
                CandidateTrainingModule.id == module_id,
                CandidateTrainingModule.candidate_id == cand.id,
            )
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    m.status = "completed"
    m.completed_at = m.completed_at or datetime.now(UTC)
    await _refresh_progress(db, cand)
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(m)
    return CandidateModuleRead.model_validate(m)


# ---------- AI interview chat ----------
TOTAL_INTERVIEW_QUESTIONS = 5


def _question_count(transcript: list[dict]) -> int:
    return sum(1 for t in transcript if t.get("role") == "interviewer")


def _last_unanswered_question(transcript: list[dict]) -> dict | None:
    # Walk backwards looking for the latest interviewer turn that has no
    # subsequent candidate response.
    for i in range(len(transcript) - 1, -1, -1):
        if transcript[i].get("role") == "interviewer":
            after = transcript[i + 1 :]
            if not any(t.get("role") == "candidate" for t in after):
                return transcript[i]
            return None
    return None


def _interview_for_caller(
    interview: AIInterview, question: dict, qnum: int
) -> StartInterviewResponse:
    return StartInterviewResponse(
        interview_id=interview.id,
        question_number=qnum,
        total_questions=TOTAL_INTERVIEW_QUESTIONS,
        question=question.get("text") or question.get("question", ""),
        skill_tested=question.get("skill_tested", ""),
        why_this_matters=question.get("why_this_matters", ""),
    )


async def _resolve_interview(
    db: AsyncSession, candidate_id: int
) -> AIInterview | None:
    return (
        await db.execute(
            select(AIInterview)
            .where(AIInterview.candidate_id == candidate_id)
            .order_by(AIInterview.id.desc())
        )
    ).scalar_one_or_none()


async def _get_role_for_candidate(
    db: AsyncSession, cand: Candidate
) -> JobRole:
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role for candidate not found")
    return role


@interview_router.post(
    "/{candidate_id}/start-ai-interview", response_model=StartInterviewResponse
)
async def start_ai_interview(
    candidate_id: int,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> StartInterviewResponse:
    if cand.id != candidate_id:
        raise HTTPException(status_code=403, detail="Cannot start interview for another candidate")
    role = await _get_role_for_candidate(db, cand)

    existing = await _resolve_interview(db, cand.id)
    if existing and existing.status == "in_progress":
        # Resume — find the most recent interviewer turn
        unanswered = _last_unanswered_question(existing.transcript_json or [])
        if unanswered:
            return _interview_for_caller(
                existing,
                unanswered,
                _question_count(existing.transcript_json or []),
            )

    # Start fresh (or resume after candidate answered the last question)
    if not existing or existing.status == "completed":
        interview = AIInterview(
            candidate_id=cand.id,
            job_role_id=role.id,
            interview_questions_json=[],
            transcript_json=[],
            score_json=[],
            overall_score=0,
            status="in_progress",
        )
        db.add(interview)
        await db.commit()
        await db.refresh(interview)
    else:
        interview = existing

    transcript = list(interview.transcript_json or [])
    qnum = _question_count(transcript) + 1
    if qnum > TOTAL_INTERVIEW_QUESTIONS:
        # Already finished — surface a no-op
        interview.status = "completed"
        await db.commit()
        raise HTTPException(status_code=400, detail="Interview already completed")

    question = await ai_service.ai_interview_question(
        role_profile=role.role_profile_json or {"title": role.title},
        interview_plan=role.interview_plan_json or [],
        question_number=qnum,
        transcript=transcript,
    )
    transcript.append(
        {
            "role": "interviewer",
            "text": question.get("question", ""),
            "skill_tested": question.get("skillTested", ""),
            "why_this_matters": question.get("whyThisMatters", ""),
        }
    )
    interview.transcript_json = transcript
    await db.commit()
    return _interview_for_caller(
        interview,
        {
            "text": question.get("question", ""),
            "skill_tested": question.get("skillTested", ""),
            "why_this_matters": question.get("whyThisMatters", ""),
        },
        qnum,
    )


@interview_router.post(
    "/{candidate_id}/submit-ai-interview-answer",
    response_model=SubmitInterviewAnswerResponse,
)
async def submit_interview_answer(
    candidate_id: int,
    payload: SubmitInterviewAnswer,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> SubmitInterviewAnswerResponse:
    if cand.id != candidate_id:
        raise HTTPException(status_code=403, detail="Cannot submit for another candidate")
    role = await _get_role_for_candidate(db, cand)
    interview = await _resolve_interview(db, cand.id)
    if not interview or interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="No interview in progress — call start first")

    transcript = list(interview.transcript_json or [])
    unanswered = _last_unanswered_question(transcript)
    if not unanswered:
        raise HTTPException(status_code=400, detail="No question waiting for an answer")

    transcript.append({"role": "candidate", "text": payload.answer})

    feedback = await ai_service.ai_evaluate_answer(
        role_profile=role.role_profile_json or {"title": role.title},
        rubric=role.rubric_json,
        question=unanswered.get("text", ""),
        answer=payload.answer,
    )
    score_int = int(feedback.get("score", 0))
    skill_scores = feedback.get("skillScores") or feedback.get("skill_scores") or []

    transcript.append(
        {
            "role": "feedback",
            "text": feedback.get("hrReviewNote", feedback.get("hr_review_note", "")),
            "score": score_int,
            "skill_tested": unanswered.get("skill_tested", ""),
        }
    )

    score_log = list(interview.score_json or [])
    score_log.append(
        {
            "question": unanswered.get("text", ""),
            "skill_tested": unanswered.get("skill_tested", ""),
            "score": score_int,
            "skill_scores": skill_scores,
            "strengths": feedback.get("strengths", []),
            "weaknesses": feedback.get("weaknesses", []),
            "red_flags": feedback.get("redFlags", feedback.get("red_flags", [])),
            "better_answer_example": feedback.get(
                "betterAnswerExample", feedback.get("better_answer_example", "")
            ),
        }
    )

    interview.transcript_json = transcript
    interview.score_json = score_log
    answered_count = sum(1 for s in score_log if "score" in s)
    interview.overall_score = (
        int(round(sum(int(s.get("score", 0)) for s in score_log) / max(1, answered_count)))
    )

    next_question_payload: StartInterviewResponse | None = None
    is_complete = answered_count >= TOTAL_INTERVIEW_QUESTIONS
    if not is_complete:
        next_qnum = answered_count + 1
        question = await ai_service.ai_interview_question(
            role_profile=role.role_profile_json or {"title": role.title},
            interview_plan=role.interview_plan_json or [],
            question_number=next_qnum,
            transcript=transcript,
        )
        transcript.append(
            {
                "role": "interviewer",
                "text": question.get("question", ""),
                "skill_tested": question.get("skillTested", ""),
                "why_this_matters": question.get("whyThisMatters", ""),
            }
        )
        interview.transcript_json = transcript
        next_question_payload = _interview_for_caller(
            interview,
            {
                "text": question.get("question", ""),
                "skill_tested": question.get("skillTested", ""),
                "why_this_matters": question.get("whyThisMatters", ""),
            },
            next_qnum,
        )
    else:
        interview.status = "completed"
        interview.finished_at = datetime.now(UTC)
        # Roll up to candidate row
        cand.ai_interview_score = interview.overall_score
        if cand.status in ("training_assigned", "training_completed", "applied"):
            cand.status = "ai_interview_completed"
        cand.updated_at = datetime.now(UTC)

    await db.commit()

    return SubmitInterviewAnswerResponse(
        feedback={
            "score": score_int,
            "skillScores": skill_scores,
            "strengths": feedback.get("strengths", []),
            "weaknesses": feedback.get("weaknesses", []),
            "redFlags": feedback.get("redFlags", feedback.get("red_flags", [])),
            "betterAnswerExample": feedback.get(
                "betterAnswerExample", feedback.get("better_answer_example", "")
            ),
            "hrReviewNote": feedback.get(
                "hrReviewNote", feedback.get("hr_review_note", "")
            ),
        },
        next_question=next_question_payload,
        is_complete=is_complete,
    )


@interview_router.post(
    "/{candidate_id}/finish-ai-interview", response_model=InterviewSummary
)
async def finish_ai_interview(
    candidate_id: int,
    cand: Annotated[Candidate, Depends(get_current_candidate)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InterviewSummary:
    if cand.id != candidate_id:
        raise HTTPException(status_code=403, detail="Cannot finish for another candidate")
    interview = await _resolve_interview(db, cand.id)
    if not interview:
        raise HTTPException(status_code=404, detail="No interview found")
    interview.status = "completed"
    interview.finished_at = interview.finished_at or datetime.now(UTC)
    if cand.status in ("training_assigned", "training_completed", "applied"):
        cand.status = "ai_interview_completed"
    cand.ai_interview_score = interview.overall_score
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(interview)
    return InterviewSummary.model_validate(interview)


@interview_router.get("/{candidate_id}/ai-interview", response_model=InterviewSummary)
async def get_interview_summary(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> InterviewSummary:
    """Admin-side view of the candidate's latest AI interview transcript."""
    interview = (
        await db.execute(
            select(AIInterview)
            .where(AIInterview.candidate_id == candidate_id)
            .order_by(AIInterview.id.desc())
        )
    ).scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="No interview found")
    return InterviewSummary.model_validate(interview)
