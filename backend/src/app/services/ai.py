"""AI service module for ELOT AI.

Wraps OpenAI and Gemini and always falls back to deterministic
sample data so the hackathon demo never breaks.

Order of preference:
1. OPENAI_API_KEY  (gpt-4o-mini by default)
2. GEMINI_API_KEY  (gemini-1.5-flash by default)
3. Sample fallback (no network, instant)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

import httpx

from .ai_prompts import (
    ADMIN_COPILOT_PROMPT,
    AI_ANSWER_EVAL_PROMPT,
    AI_INTERVIEW_QUESTION_PROMPT,
    CANDIDATE_SCORECARD_PROMPT,
    COURSE_GENERATION_PROMPT,
    ONBOARDING_PLAN_PROMPT,
    OS_FEEDBACK_SUMMARY_PROMPT,
    OS_MENTOR_PROMPT,
    OS_PLAN_PROMPT,
    OS_RISK_PROMPT,
    OS_SIMULATION_PROMPT,
    ROLE_PLAN_PROMPT,
    SCENARIO_FEEDBACK_PROMPT,
    SECURITY_TRAINING_PROMPT,
    THREAT_SUMMARY_PROMPT,
)
from .defang import defang
from .sample_data import (
    sample_admin_copilot_response,
    sample_course,
    sample_scenario_feedback,
)
from .sample_hiring import (
    sample_answer_evaluation,
    sample_interview_question,
    sample_onboarding_plan,
    sample_role_plan,
    sample_scorecard,
)
from .sample_onboarding_os import (
    sample_feedback_summary as _sample_os_feedback_summary,
    sample_mentor_answer as _sample_os_mentor,
    sample_risk_recommendation as _sample_os_risk,
    sample_simulation as _sample_os_simulation,
    sample_template_plan as _sample_os_plan,
)
from .sample_threats import sample_training_for_trend

logger = logging.getLogger("elot.ai")


# ---------------------------------------------------------------------------
# Provider selection
# ---------------------------------------------------------------------------
def _provider() -> str:
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    return "fallback"


def _openai_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")


# ---------------------------------------------------------------------------
# Low-level callers
# ---------------------------------------------------------------------------
async def _call_openai(prompt: str, *, json_mode: bool = True) -> str:
    api_key = os.environ["OPENAI_API_KEY"]
    body: dict[str, Any] = {
        "model": _openai_model(),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]


async def _call_gemini(prompt: str) -> str:
    api_key = os.environ["GEMINI_API_KEY"]
    model = _gemini_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=body)
        r.raise_for_status()
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _extract_json(text: str) -> dict[str, Any]:
    """Best-effort JSON extraction from model output."""
    text = text.strip()
    # strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # try to find the first JSON object substring
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise


async def _llm_json(prompt: str) -> dict[str, Any] | None:
    """Call the active provider and return parsed JSON, or None on failure."""
    provider = _provider()
    try:
        if provider == "openai":
            text = await _call_openai(prompt, json_mode=True)
        elif provider == "gemini":
            text = await _call_gemini(prompt)
        else:
            return None
        return _extract_json(text)
    except Exception as exc:  # noqa: BLE001 — never block the demo
        logger.warning("AI call failed (provider=%s): %s", provider, exc)
        return None


# ---------------------------------------------------------------------------
# Public surface
# ---------------------------------------------------------------------------
async def generate_course(
    policy_title: str,
    policy_text: str,
    language: str = "English",
    audience: str = "All Employees",
) -> dict[str, Any]:
    """Generate a micro-learning course from a policy.

    Always returns a structurally valid course dict. Falls back to a
    deterministic sample if the AI provider is unset or fails.
    """
    prompt = COURSE_GENERATION_PROMPT.format(
        policy_title=policy_title or "Untitled Policy",
        policy_text=policy_text,
        language=language,
        audience=audience,
    )
    result = await _llm_json(prompt)
    if not result or not isinstance(result, dict) or "lessons" not in result:
        logger.info("Using sample course fallback")
        return sample_course(policy_title=policy_title, language=language)

    # Ensure mandatory limitations array
    if "limitations" not in result or not result.get("limitations"):
        result["limitations"] = [
            "AI-generated training — please review before publishing.",
            "Not legal advice.",
            "Demo data may include sample policy content.",
        ]
    return result


async def evaluate_scenario(
    policy_text: str,
    scenario_text: str,
    user_answer: str,
) -> dict[str, Any]:
    prompt = SCENARIO_FEEDBACK_PROMPT.format(
        policy_text=policy_text or "Company compliance policy.",
        scenario=scenario_text,
        answer=user_answer,
    )
    result = await _llm_json(prompt)
    if not result or "feedback" not in result:
        return sample_scenario_feedback(user_answer)
    # Normalize aliases (some models return snake_case)
    result.setdefault("isCorrect", result.get("is_correct", False))
    result.setdefault("riskLevel", result.get("risk_level", "medium"))
    result.setdefault("betterAnswer", result.get("better_answer", ""))
    result.setdefault("policyReference", result.get("policy_reference", ""))
    result.setdefault("coachingTip", result.get("coaching_tip", ""))
    return result


async def admin_copilot(question: str, training_data: dict[str, Any]) -> dict[str, Any]:
    prompt = ADMIN_COPILOT_PROMPT.format(
        training_data_json=json.dumps(training_data, default=str),
        question=question,
    )
    result = await _llm_json(prompt)
    if not result or "answer" not in result:
        return sample_admin_copilot_response(question, training_data)
    result.setdefault("recommendedActions", result.get("recommended_actions", []))
    result.setdefault("draftMessage", result.get("draft_message", ""))
    return result


def provider_name() -> str:
    return _provider()


# ---------------------------------------------------------------------------
# Security awareness — threat summariser + safe training generator
# ---------------------------------------------------------------------------
async def summarize_trend(
    report_text: str,
    risk_level: str = "medium",
) -> dict[str, Any]:
    """Turn a raw threat report into a safe structured trend summary.

    Defangs the input before sending it to the model; the model is also
    instructed to never emit live URLs. Falls back to a generic safe
    summary if the model fails.
    """
    safe_report = defang(report_text)
    prompt = THREAT_SUMMARY_PROMPT.format(
        report_text=safe_report,
        risk_level=risk_level,
    )
    result = await _llm_json(prompt)
    if not result or "method" not in result:
        return {
            "title": "Phishing activity detected",
            "method": "Phishing",
            "channel": "Email",
            "target_users": ["All employees"],
            "red_flags": [
                "Unexpected urgency",
                "Channel switch you did not initiate",
                "Request to break a documented policy",
            ],
            "safe_response": [
                "Verify via a known channel",
                "Report to security",
                "Do not click unsolicited links",
            ],
            "training_recommendation": "Run a 3-minute refresher for all employees.",
        }
    # Belt-and-braces: defang anything the model produced.
    result["title"] = defang(result.get("title", ""))
    result["channel"] = defang(result.get("channel", ""))
    result["red_flags"] = [defang(x) for x in result.get("red_flags", [])]
    result["safe_response"] = [defang(x) for x in result.get("safe_response", [])]
    result["training_recommendation"] = defang(result.get("training_recommendation", ""))
    return result


async def generate_security_training(
    trend_summary: dict[str, Any],
    company_policy: str = "",
) -> dict[str, Any]:
    """Turn a trend summary into a safe 3-minute employee training payload."""
    trend_blob = json.dumps(trend_summary, ensure_ascii=False)
    prompt = SECURITY_TRAINING_PROMPT.format(
        trend_summary=trend_blob,
        company_policy=defang(company_policy or "(no specific policy attached)"),
    )
    result = await _llm_json(prompt)
    if not result or "scenario" not in result or "quiz" not in result:
        return sample_training_for_trend(
            trend_summary.get("title", "Phishing"),
            trend_summary.get("method", "Phishing"),
        )

    # Defang user-facing fields and force standard limitations
    def _defang_inplace(obj: Any) -> Any:
        if isinstance(obj, str):
            return defang(obj)
        if isinstance(obj, list):
            return [_defang_inplace(x) for x in obj]
        if isinstance(obj, dict):
            return {k: _defang_inplace(v) for k, v in obj.items()}
        return obj

    safe = _defang_inplace(result)
    if not safe.get("limitations"):
        safe["limitations"] = [
            "AI-generated training — admin must review before publishing.",
            "Not legal advice; confirm policy claims with your compliance team.",
            "Do not use real malicious URLs or imitate real brands in tests.",
            "Defanged indicators are not safe to copy into live email systems.",
        ]
    return safe


# ---------------------------------------------------------------------------
# Hire-to-Onboard
# ---------------------------------------------------------------------------
async def generate_role_plan(
    title: str,
    department: str,
    seniority: str,
    role_description: str,
    company_context: str = "",
) -> dict[str, Any]:
    prompt = ROLE_PLAN_PROMPT.format(
        role_description=role_description,
        company_context=company_context or "(none)",
    )
    result = await _llm_json(prompt)
    if not result or "trainingMap" not in result or "interviewPlan" not in result:
        logger.info("Using sample role-plan fallback")
        return sample_role_plan(title, department, seniority, role_description)
    if "responsibleAINotes" not in result or not result["responsibleAINotes"]:
        result["responsibleAINotes"] = [
            "AI-assisted plan — HR must review before use.",
            "ELOT AI does not make final hiring decisions.",
            "Do not score protected attributes (age, race, gender, religion, nationality, disability).",
        ]
    # Ensure roleProfile keys are present
    result.setdefault(
        "roleProfile",
        {
            "title": title,
            "department": department,
            "seniority": seniority,
            "summary": role_description[:280],
            "idealCandidate": "",
            "successOutcomes": [],
        },
    )
    return result


async def ai_interview_question(
    role_profile: dict[str, Any],
    interview_plan: list[dict[str, Any]],
    question_number: int,
    transcript: list[dict[str, Any]],
) -> dict[str, Any]:
    prompt = AI_INTERVIEW_QUESTION_PROMPT.format(
        role_profile=json.dumps(role_profile, ensure_ascii=False),
        interview_plan=json.dumps(interview_plan, ensure_ascii=False),
        question_number=question_number,
        transcript=json.dumps(transcript, ensure_ascii=False),
    )
    result = await _llm_json(prompt)
    if not result or "question" not in result:
        return sample_interview_question(question_number, role_profile)
    return {
        "question": result.get("question", ""),
        "skillTested": result.get("skillTested", ""),
        "whyThisMatters": result.get("whyThisMatters", ""),
    }


async def ai_evaluate_answer(
    role_profile: dict[str, Any],
    rubric: dict[str, Any] | None,
    question: str,
    answer: str,
) -> dict[str, Any]:
    prompt = AI_ANSWER_EVAL_PROMPT.format(
        role_profile=json.dumps(role_profile, ensure_ascii=False),
        rubric=json.dumps(rubric or {}, ensure_ascii=False),
        question=question,
        answer=answer,
    )
    result = await _llm_json(prompt)
    if not result or "score" not in result:
        return sample_answer_evaluation(answer, question)
    # Normalise aliases / fill defaults
    result.setdefault("skillScores", result.get("skill_scores", []))
    result.setdefault("redFlags", result.get("red_flags", []))
    result.setdefault("betterAnswerExample", result.get("better_answer_example", ""))
    result.setdefault("hrReviewNote", result.get("hr_review_note", ""))
    result.setdefault("strengths", [])
    result.setdefault("weaknesses", [])
    return result


async def generate_candidate_scorecard(
    candidate: dict[str, Any],
    training_results: dict[str, Any],
    interview_results: dict[str, Any],
    rubric: dict[str, Any] | None,
) -> dict[str, Any]:
    prompt = CANDIDATE_SCORECARD_PROMPT.format(
        candidate_data=json.dumps(candidate, ensure_ascii=False, default=str),
        training_results=json.dumps(training_results, ensure_ascii=False, default=str),
        interview_results=json.dumps(interview_results, ensure_ascii=False, default=str),
        rubric=json.dumps(rubric or {}, ensure_ascii=False),
    )
    result = await _llm_json(prompt)
    if not result or "recommendation" not in result:
        return sample_scorecard(candidate, training_results, interview_results)
    # Force a responsible-AI note
    result.setdefault(
        "responsibleAINote",
        "This is an AI-generated recommendation for HR review, not an automated hiring decision.",
    )
    # Light sanity-clamp on the score
    score = result.get("overallReadinessScore") or 0
    try:
        score_int = int(score)
    except (TypeError, ValueError):
        score_int = 0
    result["overallReadinessScore"] = max(0, min(100, score_int))
    return result


async def generate_onboarding_plan(
    role_profile: dict[str, Any],
    scorecard: dict[str, Any] | None,
    company_policies: str = "",
) -> dict[str, Any]:
    prompt = ONBOARDING_PLAN_PROMPT.format(
        role_profile=json.dumps(role_profile, ensure_ascii=False),
        scorecard=json.dumps(scorecard or {}, ensure_ascii=False, default=str),
        company_policies=company_policies or "(use company defaults)",
    )
    result = await _llm_json(prompt)
    if not result or "modules" not in result:
        return sample_onboarding_plan(role_profile.get("title", "New hire"), scorecard)
    result.setdefault("readinessMilestones", [])
    result.setdefault("managerChecklist", [])
    return result


# ---------------------------------------------------------------------------
# Sync wrappers (used by seed scripts where async is overkill)
# ---------------------------------------------------------------------------
def generate_course_sync(*args: Any, **kwargs: Any) -> dict[str, Any]:
    return asyncio.run(generate_course(*args, **kwargs))


# ---------------------------------------------------------------------------
# Onboarding OS — 5 new AI surfaces, each with a safe fallback
# ---------------------------------------------------------------------------
async def os_generate_plan(
    role_name: str,
    description: str,
    department: str = "Engineering",
    company_context: str = "",
) -> dict[str, Any]:
    prompt = OS_PLAN_PROMPT.format(
        role_name=role_name,
        description=description,
        department=department,
        company_context=company_context or "(none)",
    )
    result = await _llm_json(prompt)
    if not result or "tasks" not in result or not isinstance(result.get("tasks"), list):
        logger.info("OS plan fallback")
        return _sample_os_plan(role_name, department)
    return result


async def os_analyze_risk(snapshot: dict[str, Any]) -> dict[str, Any]:
    prompt = OS_RISK_PROMPT.format(snapshot_json=json.dumps(snapshot, default=str))
    result = await _llm_json(prompt)
    if not result or "risk_level" not in result:
        return _sample_os_risk(snapshot)
    return result


async def os_summarize_feedback(items: list[dict[str, Any]]) -> dict[str, Any]:
    prompt = OS_FEEDBACK_SUMMARY_PROMPT.format(
        feedback_json=json.dumps(items, default=str),
    )
    result = await _llm_json(prompt)
    if not result or "strengths" not in result:
        return _sample_os_feedback_summary(items)
    return result


async def os_mentor_answer(
    question: str,
    context: dict[str, Any],
) -> dict[str, Any]:
    prompt = OS_MENTOR_PROMPT.format(
        context_json=json.dumps(context, default=str),
        question=question,
    )
    result = await _llm_json(prompt)
    if not result or "answer" not in result:
        return _sample_os_mentor(question, context)
    return result


async def os_generate_simulation(
    role_name: str,
    stage: str = "day_30",
    company_policy: str = "",
) -> dict[str, Any]:
    prompt = OS_SIMULATION_PROMPT.format(
        role_name=role_name,
        stage=stage,
        company_policy=company_policy or "(none)",
    )
    result = await _llm_json(prompt)
    if not result or "scene" not in result:
        return _sample_os_simulation(role_name, stage)
    return result
