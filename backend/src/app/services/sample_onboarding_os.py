"""Fallback content for the Onboarding OS — used when no AI key is set."""

from __future__ import annotations

from typing import Any


def sample_template_plan(
    role_name: str,
    department: str = "Engineering",
    duration_days: int = 90,
) -> dict[str, Any]:
    """Return a deterministic 14-task onboarding plan covering all stages."""
    return {
        "name": f"{role_name} Onboarding",
        "role_name": role_name,
        "department": department,
        "duration_days": duration_days,
        "description": (
            f"Structured 90-day onboarding for a new {role_name} in {department}. "
            "Covers preboarding, day 1, week 1, day 30, day 60, day 90, plus the manager / "
            "supervisor / buddy checkpoints needed to ship a ready-to-perform team member."
        ),
        "success_criteria": (
            "Compliance training complete with score ≥80; first practical task approved "
            "by supervisor; 30/60/90 manager reviews logged; final readiness score ≥70."
        ),
        "required_score": 70,
        "final_approval_required": True,
        "tasks": [
            # Preboarding (HR + IT)
            {
                "title": "Sign offer letter & complete pre-hire paperwork",
                "description": "Return signed offer + tax forms via secure HR portal.",
                "stage": "preboarding",
                "category": "compliance",
                "default_due_day": -7,
                "default_owner_role": "employee",
                "default_reviewer_role": "hr",
                "approval_required": True,
                "priority": "high",
                "order_index": 0,
            },
            {
                "title": "Provision laptop and core accounts",
                "description": "IT issues laptop, sets up SSO, email, MFA, and the core tooling.",
                "stage": "preboarding",
                "category": "it_setup",
                "default_due_day": -3,
                "default_owner_role": "it",
                "default_reviewer_role": "it",
                "approval_required": True,
                "priority": "high",
                "order_index": 1,
            },
            # Day 1 — orientation
            {
                "title": "Day 1 orientation + meet the team",
                "description": "Welcome session, intro to manager, supervisor and buddy.",
                "stage": "day_1",
                "category": "culture",
                "default_due_day": 1,
                "default_owner_role": "employee",
                "default_reviewer_role": "hr",
                "priority": "medium",
                "order_index": 2,
            },
            {
                "title": "Company structure overview",
                "description": "Read the company handbook section on org structure + decision rights.",
                "stage": "day_1",
                "category": "culture",
                "default_due_day": 1,
                "default_owner_role": "employee",
                "default_reviewer_role": "hr",
                "required_score": 80,
                "order_index": 3,
                "quiz": [
                    {
                        "question": "Who owns sign-off on a customer-data-handling decision?",
                        "options": [
                            "Any engineer on the team",
                            "Your immediate manager",
                            "Security + Compliance leads",
                            "The first person you ask in Slack",
                        ],
                        "correctAnswer": "Security + Compliance leads",
                        "explanation": "Customer-data sign-off escalates to Security + Compliance regardless of team.",
                    },
                ],
            },
            # Week 1 — compliance + role training
            {
                "title": "Workplace conduct & harassment prevention",
                "description": "Complete the workplace conduct micro-course + quiz.",
                "stage": "week_1",
                "category": "compliance",
                "default_due_day": 5,
                "approval_required": True,
                "required_score": 80,
                "priority": "high",
                "order_index": 4,
            },
            {
                "title": "Cybersecurity awareness",
                "description": "Complete the cyber-awareness training and pass the phishing scenario.",
                "stage": "week_1",
                "category": "compliance",
                "default_due_day": 5,
                "approval_required": True,
                "required_score": 80,
                "priority": "high",
                "order_index": 5,
            },
            {
                "title": "Data privacy essentials",
                "description": "Customer data handling + approved tooling.",
                "stage": "week_1",
                "category": "compliance",
                "default_due_day": 7,
                "approval_required": True,
                "required_score": 80,
                "priority": "high",
                "order_index": 6,
            },
            {
                "title": "Role-specific orientation",
                "description": "Supervisor walks through team conventions, repos, deploy pipeline.",
                "stage": "week_1",
                "category": "role_training",
                "default_due_day": 7,
                "default_owner_role": "supervisor",
                "default_reviewer_role": "supervisor",
                "feedback_required": True,
                "order_index": 7,
            },
            # Day 30 — first practical task + manager review
            {
                "title": "Ship first practical task with supervisor review",
                "description": (
                    "Take a small scoped ticket end-to-end. Supervisor reviews code quality, "
                    "communication, and process adherence."
                ),
                "stage": "day_30",
                "category": "practical",
                "default_due_day": 25,
                "default_owner_role": "employee",
                "default_reviewer_role": "supervisor",
                "approval_required": True,
                "feedback_required": True,
                "priority": "high",
                "order_index": 8,
            },
            {
                "title": "30-day manager review",
                "description": "Manager fills the 30-day rubric and sets next 30-day goals.",
                "stage": "day_30",
                "category": "manager_review",
                "default_due_day": 30,
                "default_owner_role": "manager",
                "default_reviewer_role": "manager",
                "approval_required": True,
                "order_index": 9,
            },
            # Day 60
            {
                "title": "Buddy 30-day check-in",
                "description": "Informal team-fit + culture conversation.",
                "stage": "day_60",
                "category": "buddy_checkin",
                "default_due_day": 45,
                "default_owner_role": "buddy",
                "default_reviewer_role": "buddy",
                "feedback_required": True,
                "order_index": 10,
            },
            {
                "title": "60-day manager review",
                "description": "Manager assesses ownership + productivity, sets day-90 goals.",
                "stage": "day_60",
                "category": "manager_review",
                "default_due_day": 60,
                "default_owner_role": "manager",
                "default_reviewer_role": "manager",
                "approval_required": True,
                "order_index": 11,
            },
            # Day 90
            {
                "title": "AI simulation: handle an escalated customer issue",
                "description": "Roleplay a realistic edge case. AI scores process + communication.",
                "stage": "day_90",
                "category": "ai_simulation",
                "default_due_day": 80,
                "approval_required": False,
                "required_score": 70,
                "order_index": 12,
            },
            {
                "title": "90-day final review & onboarding sign-off",
                "description": (
                    "Manager + HR co-sign the final readiness decision: Ready / Ready with "
                    "support / Extended / Needs PIP / Not ready."
                ),
                "stage": "day_90",
                "category": "final_evaluation",
                "default_due_day": 90,
                "default_owner_role": "manager",
                "default_reviewer_role": "hr",
                "approval_required": True,
                "feedback_required": True,
                "priority": "critical",
                "order_index": 13,
            },
        ],
    }


def sample_risk_recommendation(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Lightweight rule-based fallback if the model is unavailable."""
    overdue = snapshot.get("overdue_tasks", 0)
    failed = snapshot.get("failed_tasks", 0)
    avg_score = snapshot.get("avg_quiz_score", 100)
    risk = "low"
    reasons: list[str] = []
    if failed >= 2 or avg_score < 60:
        risk = "high"
    elif failed >= 1 or overdue >= 1 or avg_score < 75:
        risk = "medium"
    if overdue:
        reasons.append(f"{overdue} overdue task(s)")
    if failed:
        reasons.append(f"{failed} failed task(s)")
    if avg_score < 80:
        reasons.append(f"average quiz score {int(avg_score)}")
    if not reasons:
        reasons.append("All required tasks on track")
    actions = {
        "high": "Assign an extra cybersecurity module and schedule a manager check-in this week.",
        "medium": "Have the supervisor assign a smaller scoped practical task with a guided review.",
        "low": "Keep cadence — buddy check-in next week, 30-day manager review on schedule.",
    }
    training = {
        "high": ["Phishing simulation refresher", "Security policy walkthrough"],
        "medium": ["Practical task pairing session"],
        "low": [],
    }
    return {
        "risk_level": risk,
        "reason": "; ".join(reasons) + ".",
        "recommended_action": actions[risk],
        "recommended_training": training[risk],
        "notify_roles": ["HR", "Manager"] if risk != "low" else ["Manager"],
    }


def sample_feedback_summary(feedback_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Rule-based grouping when the model is unavailable."""
    strengths: list[str] = []
    weaknesses: list[str] = []
    for f in feedback_items:
        if f.get("strengths"):
            strengths.append(f["strengths"])
        if f.get("weaknesses"):
            weaknesses.append(f["weaknesses"])
    return {
        "summary": (
            f"{len(feedback_items)} feedback entries from supervisor, manager and buddy. "
            "Strengths and weaknesses are listed below — HR makes the final call."
        ),
        "strengths": strengths[:5],
        "weaknesses": weaknesses[:5],
        "ai_disclosure": "AI-derived summary for HR review only — not a hiring decision.",
    }


def sample_mentor_answer(question: str, context: dict[str, Any]) -> dict[str, Any]:
    """Very simple keyword router for the AI mentor fallback."""
    q = (question or "").lower()
    instance = context.get("instance", {})
    manager = context.get("manager_name", "your assigned manager")
    supervisor = context.get("supervisor_name", "your supervisor")
    next_tasks = context.get("next_tasks", [])

    if "supervisor" in q:
        return {
            "answer": f"Your supervisor is {supervisor}. They review your practical work.",
            "sources": ["Onboarding instance metadata"],
            "confidence": "high",
        }
    if "manager" in q:
        return {
            "answer": (
                f"Your manager is {manager}. They run your 30/60/90-day reviews and "
                "approve the final onboarding decision."
            ),
            "sources": ["Onboarding instance metadata"],
            "confidence": "high",
        }
    if "this week" in q or "next" in q:
        if not next_tasks:
            return {
                "answer": "Nothing pending this week — well done. Keep up your buddy check-ins.",
                "sources": [],
                "confidence": "medium",
            }
        titles = ", ".join(t["title"] for t in next_tasks[:3])
        return {
            "answer": f"Focus on: {titles}.",
            "sources": [t["title"] for t in next_tasks[:3]],
            "confidence": "high",
        }
    if "leave" in q or "vacation" in q:
        return {
            "answer": (
                "Submit a leave request through your HR portal at least 5 working days in "
                "advance. Your manager approves first; HR confirms compliance."
            ),
            "sources": ["Company handbook — Leave policy"],
            "confidence": "medium",
        }
    if "git" in q or "workflow" in q:
        return {
            "answer": (
                "Use feature branches off main, open a PR with at least one approving review, "
                "and rely on the CI gate before merge. Squash-merge by default."
            ),
            "sources": ["Engineering handbook — Git workflow"],
            "confidence": "medium",
        }

    return {
        "answer": (
            "Here's what I can do today: tell you who your manager / supervisor / buddy is, "
            "summarise what's due this week, and point you at the right company handbook "
            "section. Ask me about Git workflow, leave policy, security policy, or your next "
            "training."
        ),
        "sources": [],
        "confidence": "low",
    }


def sample_simulation(role_name: str, stage: str) -> dict[str, Any]:
    return {
        "title": f"{role_name} — escalated customer issue",
        "scene": (
            "A customer is in chat at 17:55 on a Friday, angry that their refund hasn't "
            "arrived. The refund amount is $240 — above the $100 escalation threshold. "
            "They are also asking you to confirm their card number 'for verification'."
        ),
        "question": "What is the safest first action?",
        "options": [
            "Read the refund status back to them so they know we received it",
            "Escalate to the on-call manager and refuse to confirm card details",
            "Process the refund yourself to keep the customer happy",
            "Ask the customer for the last 4 digits of their card to verify",
        ],
        "correctAnswer": "Escalate to the on-call manager and refuse to confirm card details",
        "explanation": (
            "Refunds above $100 must be escalated. Customer card data must never be confirmed "
            "back to them. Saying no to the card-details ask is the correct protective response."
        ),
        "rubric": [
            {"criterion": "Escalation discipline", "weight": 40},
            {"criterion": "Data protection", "weight": 40},
            {"criterion": "Customer communication", "weight": 20},
        ],
    }
