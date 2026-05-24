"""Deterministic fallback content for ELOT AI.

These structures match the AI JSON contracts exactly so the rest of
the application can ignore whether the LLM was reachable.
"""

from __future__ import annotations

from typing import Any


def sample_course(policy_title: str = "Company Policy", language: str = "English") -> dict[str, Any]:
    return {
        "title": f"{policy_title} — Practical Training",
        "description": (
            "A short, practical training course generated from your company policy. "
            "Includes realistic workplace scenarios and a knowledge check."
        ),
        "estimatedMinutes": 12,
        "difficulty": "beginner",
        "learningObjectives": [
            "Understand what the policy requires in day-to-day work",
            "Recognise high-risk situations and respond correctly",
            "Know exactly where to report concerns",
        ],
        "lessons": [
            {
                "title": "What the policy is and why it matters",
                "content": (
                    "This lesson summarises the policy in plain language. The goal is to make "
                    "sure every employee knows the rules, where they apply, and the practical "
                    "consequences of ignoring them."
                ),
                "keyTakeaway": "Follow the policy — when in doubt, ask before acting.",
                "roleBasedExamples": {
                    "HR": "Confirm onboarding checklists include the policy acknowledgement.",
                    "Engineering": "Use approved tools only — never paste secrets into public AI.",
                    "Sales": "Never share customer lists or pricing data over personal channels.",
                    "Manager": "Reinforce the policy with your team in 1:1s.",
                },
            },
            {
                "title": "Spotting risky situations",
                "content": (
                    "Most violations happen when employees are rushed or trying to be helpful. "
                    "Watch for: urgent payment requests, unsolicited links, requests to bypass "
                    "process, and any attempt to move data outside approved systems."
                ),
                "keyTakeaway": "Slow down. Urgency is the most common attack signal.",
                "roleBasedExamples": {
                    "HR": "Verify benefit-change requests with the employee in person.",
                    "Engineering": "Never disable security checks 'just for testing'.",
                    "Sales": "Confirm wire-transfer instructions through a known channel.",
                    "Manager": "Lead by example — never ask staff to bypass policy.",
                },
            },
            {
                "title": "How to report and recover",
                "content": (
                    "If something feels wrong, report it to the security team immediately. "
                    "Early reporting limits damage and is never penalised."
                ),
                "keyTakeaway": "Report fast — early reporting is rewarded, not punished.",
                "roleBasedExamples": {
                    "HR": "Flag suspected social engineering to security@company.",
                    "Engineering": "Open an incident ticket the moment a leak is suspected.",
                    "Sales": "Tell your manager and security if a customer asks you to bypass policy.",
                    "Manager": "Escalate suspected violations within 24 hours.",
                },
            },
        ],
        "scenarios": [
            {
                "title": "Customer data over personal messenger",
                "situation": (
                    "A teammate asks you to send a spreadsheet of customer emails to their "
                    "personal Telegram so they can work on it from home tonight."
                ),
                "question": "What do you do?",
                "idealAnswer": (
                    "Refuse. Explain that customer data may only move through approved company "
                    "systems and offer to help them get proper access instead. Report it if it "
                    "happens again."
                ),
                "riskLevel": "high",
                "policyReference": "Customer data must only be stored and transferred through approved company systems.",
            },
            {
                "title": "Suspicious link from a 'vendor'",
                "situation": (
                    "You receive an email that looks like it's from a known vendor asking you "
                    "to click a link and re-enter your login to 'verify' your account."
                ),
                "question": "What is the right next step?",
                "idealAnswer": (
                    "Do not click. Report the email to the security team and confirm the "
                    "request with the vendor through a known channel."
                ),
                "riskLevel": "high",
                "policyReference": "Suspicious links and password requests must be reported to security immediately.",
            },
            {
                "title": "AI tool with company data",
                "situation": (
                    "A colleague pastes a large block of internal customer feedback into a "
                    "public AI chatbot to summarise it quickly."
                ),
                "question": "How should you respond?",
                "idealAnswer": (
                    "Ask them to stop, explain that public AI tools are not approved for "
                    "customer data, and point them at the company-approved tool."
                ),
                "riskLevel": "medium",
                "policyReference": "Do not share customer data through public AI tools.",
            },
        ],
        "quiz": [
            {
                "question": "Where may customer data be stored?",
                "options": [
                    "Personal email if convenient",
                    "Only in approved company systems",
                    "Any messaging app the team uses",
                    "USB drives if encrypted",
                ],
                "correctAnswer": "Only in approved company systems",
                "explanation": "Approved systems are the only place where customer data is allowed.",
                "topic": "Data handling",
            },
            {
                "question": "You get a suspicious link asking for your password. You should…",
                "options": [
                    "Click it to investigate",
                    "Forward it to your team",
                    "Report it to the security team",
                    "Ignore it",
                ],
                "correctAnswer": "Report it to the security team",
                "explanation": "Suspicious requests must be reported immediately.",
                "topic": "Phishing",
            },
            {
                "question": "A colleague wants to paste customer data into a public AI tool. The policy says…",
                "options": [
                    "It is allowed if the tool is popular",
                    "It is allowed for summarisation",
                    "It is not allowed",
                    "It is allowed during evenings only",
                ],
                "correctAnswer": "It is not allowed",
                "explanation": "Public AI tools are not approved for customer data.",
                "topic": "AI usage",
            },
            {
                "question": "What is the right time to report a suspected violation?",
                "options": [
                    "At the end of the quarter",
                    "Only if it caused damage",
                    "Immediately",
                    "Never — it might cause trouble",
                ],
                "correctAnswer": "Immediately",
                "explanation": "Early reporting limits damage and is never penalised.",
                "topic": "Reporting",
            },
            {
                "question": "Who is responsible for following the policy?",
                "options": [
                    "Only the security team",
                    "Only managers",
                    "Every employee",
                    "Only new hires",
                ],
                "correctAnswer": "Every employee",
                "explanation": "Compliance is everyone's responsibility.",
                "topic": "Responsibility",
            },
        ],
        "certificateTitle": f"{policy_title} Certificate of Completion",
        "limitations": [
            "This training is AI-generated and must be reviewed by an admin before publishing.",
            "Not legal advice — consult your compliance officer for binding interpretations.",
            "Sample policy content may be used in the demo environment.",
            "Do not upload private, sensitive, or personally identifying employee data.",
        ],
    }


def sample_scenario_feedback(user_answer: str) -> dict[str, Any]:
    text = (user_answer or "").lower()
    strong_signals = ["report", "refuse", "do not", "don't", "approved", "security team", "policy"]
    weak_signals = ["maybe", "ok", "sure", "send", "share"]

    hits = sum(s in text for s in strong_signals)
    weak_hits = sum(s in text for s in weak_signals)

    if hits >= 2 and weak_hits == 0:
        score = 90
        is_correct = True
        risk = "low"
        feedback = "Strong answer — you refused the unsafe action and pointed to the right channel."
    elif hits >= 1:
        score = 70
        is_correct = True
        risk = "medium"
        feedback = "On the right track. Be more explicit about reporting and using approved systems."
    else:
        score = 35
        is_correct = False
        risk = "high"
        feedback = "This answer is risky. You should refuse, use approved channels, and report it."

    return {
        "isCorrect": is_correct,
        "score": score,
        "riskLevel": risk,
        "feedback": feedback,
        "betterAnswer": (
            "Refuse the request, explain the policy, suggest the approved alternative, "
            "and report the incident to security."
        ),
        "policyReference": "Customer data must only move through approved company systems.",
        "coachingTip": (
            "When asked to bypass policy, repeat the rule back to the requester and "
            "offer the right path — it deflects pressure without escalating the conflict."
        ),
    }


def sample_admin_copilot_response(question: str, training_data: dict[str, Any]) -> dict[str, Any]:
    q = (question or "").lower()
    employees = training_data.get("employees", [])
    weakest = training_data.get("weakest_topics", [])
    overdue = [e for e in employees if (e.get("overdue") or 0) > 0]
    high_risk = [e for e in employees if e.get("risk_level") == "high"]

    if "retraining" in q or "who needs" in q:
        names = [e["name"] for e in (high_risk or overdue)[:5]]
        return {
            "answer": (
                f"{len(names)} employees need retraining based on overdue assignments and "
                "high risk scores."
            ),
            "evidence": [f"{n} — overdue or high-risk" for n in names] or ["No high-risk employees right now."],
            "recommendedActions": [
                "Re-assign the Cybersecurity Basics course to the listed employees.",
                "Set a 7-day due date and send a reminder.",
            ],
            "draftMessage": (
                "Hi team,\n\nOur compliance dashboard flagged a few outstanding trainings. "
                "Please complete the assigned course by end of week — it only takes ~12 minutes.\n\n"
                "Thanks,\nELOT AI"
            ),
        }
    if "department" in q and "risk" in q:
        depts = training_data.get("department_stats", [])
        worst = max(depts, key=lambda d: d.get("high_risk", 0), default=None)
        if worst:
            return {
                "answer": f"{worst['department']} has the highest risk concentration.",
                "evidence": [f"{worst['department']}: {worst['high_risk']} high-risk employees, average score {worst['average_score']:.0f}."],
                "recommendedActions": [
                    f"Schedule a 30-minute live training session with {worst['department']}.",
                    "Re-assign all overdue courses with a 5-day deadline.",
                ],
                "draftMessage": (
                    f"Hi {worst['department']} team,\n\nWe noticed completion rates have dropped this quarter. "
                    "Please prioritise your assigned training this week — it's short and important.\n\nThanks!"
                ),
            }
    if "weakest topic" in q or "weakest" in q:
        if weakest:
            top = weakest[0]
            return {
                "answer": f"The weakest topic is '{top['topic']}' (avg score {top['average_score']:.0f}).",
                "evidence": [f"{w['topic']}: avg {w['average_score']:.0f} over {w['attempts']} attempts" for w in weakest[:3]],
                "recommendedActions": [
                    f"Build a focused 5-minute refresher on '{top['topic']}'.",
                    "Re-quiz employees who scored below 60.",
                ],
                "draftMessage": "",
            }
    if "reminder" in q or "incomplete" in q:
        return {
            "answer": f"{len(overdue)} employees have overdue training.",
            "evidence": [f"{e['name']} — {e.get('overdue', 0)} overdue" for e in overdue[:5]] or ["No overdue training right now."],
            "recommendedActions": ["Send the reminder below to overdue employees."],
            "draftMessage": (
                "Hi,\n\nYou have one or more outstanding trainings on ELOT AI. Please complete them "
                "this week — they take ~12 minutes and are required for compliance.\n\nThanks,\nELOT AI"
            ),
        }
    if "summarize" in q or "summary" in q or "leadership" in q:
        return {
            "answer": (
                "Overall compliance is healthy but a few hotspots remain — Engineering has the "
                "highest risk and Phishing is the weakest topic."
            ),
            "evidence": [
                f"Total employees: {training_data.get('total_employees', 0)}",
                f"Completion rate: {training_data.get('completion_rate', 0):.0%}",
                f"Average score: {training_data.get('average_score', 0):.0f}",
                f"High-risk employees: {training_data.get('high_risk_count', 0)}",
            ],
            "recommendedActions": [
                "Re-assign overdue training with a 5-day deadline.",
                "Run a Phishing refresher across all departments.",
            ],
            "draftMessage": "",
        }

    return {
        "answer": (
            "I can help with retraining, department risk, weakest topics, reminder drafts, "
            "or leadership summaries. Ask one of the suggested questions to start."
        ),
        "evidence": [f"Total employees: {training_data.get('total_employees', 0)}"],
        "recommendedActions": [
            "Try: 'Who needs retraining?'",
            "Try: 'Which department has the highest risk?'",
            "Try: 'What is the weakest topic?'",
        ],
        "draftMessage": "",
    }
