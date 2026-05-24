"""Deterministic, safe fallbacks for the hire-to-onboard module.

Used when no AI key is configured, when the model call fails, or as the
deterministic seed content shipped with the demo. Every output here is
designed to be representative of what the AI produces without making any
final hiring decision.
"""

from __future__ import annotations

from typing import Any


def sample_role_plan(title: str, department: str, seniority: str, role_description: str) -> dict[str, Any]:
    """Generate a complete plan for a customer-support style role.

    Generic enough to fit most roles passed through it.
    """
    role_lc = title.lower()
    is_support = "support" in role_lc or "customer" in role_lc or "service" in role_lc
    is_eng = "engineer" in role_lc or "developer" in role_lc
    is_sales = "sales" in role_lc or "account" in role_lc

    skills: list[dict[str, Any]] = [
        {
            "name": "Clear written + spoken communication",
            "category": "communication",
            "importance": "high",
            "description": "Explain decisions in plain language; calm tone under pressure.",
        },
        {
            "name": "Policy literacy",
            "category": "policy",
            "importance": "high",
            "description": "Knows what the company policy says and where to find it.",
        },
        {
            "name": "Data handling & privacy",
            "category": "security",
            "importance": "high",
            "description": "Never moves customer data through unapproved channels.",
        },
        {
            "name": "Problem solving under pressure",
            "category": "communication",
            "importance": "medium",
            "description": "Calmly diagnoses an unclear situation and asks for help when needed.",
        },
        {
            "name": "Cultural alignment",
            "category": "culture",
            "importance": "medium",
            "description": "Treats colleagues and customers with respect; follows company values.",
        },
    ]
    if is_eng:
        skills.insert(
            0,
            {
                "name": "Engineering fundamentals",
                "category": "technical",
                "importance": "high",
                "description": "Understands version control, code review, and writing tests.",
            },
        )
    if is_sales:
        skills.append(
            {
                "name": "Customer empathy & discovery",
                "category": "domain",
                "importance": "high",
                "description": "Listens before pitching; asks open questions to find the real need.",
            },
        )

    training = [
        {
            "title": "Understanding the role",
            "description": "Day-in-the-life overview and how this role serves customers and teammates.",
            "content": (
                "This short lesson walks through what the role does, who it works with, "
                "and what success looks like in the first 90 days. Read carefully — the "
                "quiz at the end checks comprehension."
            ),
            "quiz": [
                {
                    "question": "What is the most common type of work this role does daily?",
                    "options": [
                        "Designing the company brand",
                        "Helping customers solve real problems",
                        "Building physical hardware",
                        "Managing finance reports",
                    ],
                    "correctAnswer": "Helping customers solve real problems",
                    "explanation": "Most days for this role are about practical, customer-facing work.",
                },
                {
                    "question": "Who do you go to when a situation is outside policy?",
                    "options": [
                        "Try to handle it yourself in private",
                        "Ask a teammate quietly so the manager doesn't notice",
                        "Escalate to your manager and document it",
                        "Post about it publicly",
                    ],
                    "correctAnswer": "Escalate to your manager and document it",
                    "explanation": "Escalation and documentation are required when something falls outside policy.",
                },
            ],
        },
        {
            "title": "Customer data & privacy basics",
            "description": "What is allowed, what is not, and how to report concerns.",
            "content": (
                "Customer data may only move through approved company systems. Never use "
                "personal email, messaging apps, USB drives, or public AI tools to share "
                "customer information. If you see something risky, report it to the "
                "security team immediately."
            ),
            "quiz": [
                {
                    "question": "Where may customer data be stored?",
                    "options": [
                        "Personal email",
                        "Only in approved company systems",
                        "Any messaging app",
                        "USB drives if encrypted",
                    ],
                    "correctAnswer": "Only in approved company systems",
                    "explanation": "Approved systems are the only place where customer data is allowed.",
                },
                {
                    "question": "A teammate asks you to copy customer emails into a public AI tool. You should…",
                    "options": [
                        "Help — it's faster",
                        "Refuse and explain the policy",
                        "Forward to your manager only",
                        "Use a personal account instead",
                    ],
                    "correctAnswer": "Refuse and explain the policy",
                    "explanation": "Public AI tools are not approved for customer data.",
                },
            ],
        },
        {
            "title": "Escalation & decision-making",
            "description": "When to act, when to ask, and when to escalate.",
            "content": (
                "Refund requests above $100 must be escalated to a manager. Anything that "
                "feels urgent, unusual, or outside policy should be reported. Documenting "
                "the situation protects you, the customer, and the company."
            ),
            "quiz": [
                {
                    "question": "A customer demands a $300 refund 'right now'. What do you do first?",
                    "options": [
                        "Refund it to make them happy",
                        "Ignore the request",
                        "Escalate to a manager and document the case",
                        "Tell them refunds are impossible",
                    ],
                    "correctAnswer": "Escalate to a manager and document the case",
                    "explanation": "Refunds above $100 require manager approval.",
                },
            ],
        },
    ]

    interview = [
        {
            "question": "A customer is angry because their package is late. Walk me through how you would handle the conversation.",
            "skillTested": "Communication under pressure",
            "goodAnswerSignals": [
                "Listens first and acknowledges the customer",
                "Stays calm and uses neutral language",
                "Offers next-best actions instead of empty promises",
            ],
            "redFlags": [
                "Becomes defensive or blames the customer",
                "Promises specific timelines they cannot keep",
            ],
            "scoreWeight": 25,
        },
        {
            "question": "A teammate asks you to share customer emails by personal WhatsApp. How do you respond?",
            "skillTested": "Policy & data privacy",
            "goodAnswerSignals": [
                "Refuses clearly",
                "Cites the customer-data policy",
                "Offers an approved alternative",
            ],
            "redFlags": [
                "Agrees because it's 'just a teammate'",
                "Doesn't recognise the privacy risk",
            ],
            "scoreWeight": 25,
        },
        {
            "question": "A customer asks for a $300 refund. What is your process?",
            "skillTested": "Escalation & judgement",
            "goodAnswerSignals": [
                "Recognises this is above the personal limit",
                "Escalates and documents the case",
            ],
            "redFlags": [
                "Approves silently without escalating",
                "Refuses without exploring alternatives",
            ],
            "scoreWeight": 20,
        },
        {
            "question": "Describe a time you made a small mistake. How did you handle it?",
            "skillTested": "Accountability",
            "goodAnswerSignals": [
                "Takes ownership without blaming others",
                "Describes a concrete corrective action",
            ],
            "redFlags": [
                "Refuses to admit any mistake",
                "Blames a teammate or manager",
            ],
            "scoreWeight": 15,
        },
        {
            "question": "You get an email asking you to click a link and re-enter your login. What's your response?",
            "skillTested": "Security awareness",
            "goodAnswerSignals": [
                "Refuses to click",
                "Reports to security",
                "Checks the URL & sender carefully",
            ],
            "redFlags": [
                "Clicks the link to investigate",
                "Forwards it to teammates",
            ],
            "scoreWeight": 15,
        },
    ]

    assessment = [
        {
            "taskTitle": "Customer email triage",
            "taskDescription": (
                "Read three sample customer emails and decide which to refund, "
                "escalate, or respond to directly. Explain your reasoning in 2-3 sentences each."
            ),
            "evaluationCriteria": [
                "Correct triage decision",
                "Clear written reasoning",
                "Policy compliance",
            ],
        },
        {
            "taskTitle": "Phishing simulation",
            "taskDescription": "Given a simulated suspicious email, explain how you would respond.",
            "evaluationCriteria": [
                "Recognises red flags",
                "Refuses to click",
                "Reports to security",
            ],
        },
    ]

    rubric = {
        "categories": [
            {
                "name": "Communication",
                "weight": 25,
                "description": "Clarity, empathy, and tone under pressure.",
            },
            {
                "name": "Policy & data privacy",
                "weight": 25,
                "description": "Knows the rules and applies them in tricky situations.",
            },
            {
                "name": "Judgement & escalation",
                "weight": 20,
                "description": "Knows when to act vs. when to escalate.",
            },
            {
                "name": "Security awareness",
                "weight": 15,
                "description": "Recognises and reports phishing / unsafe requests.",
            },
            {
                "name": "Accountability & culture",
                "weight": 15,
                "description": "Takes ownership; respectful with colleagues.",
            },
        ],
        "passingScore": 65,
    }

    onboarding = [
        {
            "title": "Company structure & how we work",
            "description": "Org chart, decision rights, who to ask for what.",
            "type": "company_structure",
        },
        {
            "title": "Role-specific onboarding",
            "description": f"Day-in-the-life walkthrough for a {seniority} {title} in {department}.",
            "type": "role_training",
        },
        {
            "title": "Cybersecurity awareness",
            "description": "Phishing, MFA, suspicious requests, and how to report.",
            "type": "security",
        },
        {
            "title": "Workplace conduct & anti-harassment",
            "description": "What respectful workplace conduct looks like and how to report issues.",
            "type": "harassment",
        },
        {
            "title": "Data privacy & customer information",
            "description": "Approved channels and what to do when in doubt.",
            "type": "data_privacy",
        },
        {
            "title": "AI tool usage policy",
            "description": "When AI is allowed at work and what data must never go into public AI tools.",
            "type": "ai_usage",
        },
    ]

    return {
        "roleProfile": {
            "title": title,
            "department": department,
            "seniority": seniority,
            "summary": (
                role_description.split("\n")[0][:280]
                if role_description
                else f"{seniority} {title} in {department} — practical, customer-facing role."
            ),
            "idealCandidate": (
                "Clear communicator, calm under pressure, follows policy carefully, "
                "knows when to escalate, and asks good questions before acting."
            ),
            "successOutcomes": [
                "Handles day-to-day situations confidently within the first 60 days",
                "Never moves customer data through unapproved channels",
                "Escalates risky requests instead of acting alone",
                "Completes onboarding training with passing scores",
            ],
        },
        "requiredSkills": skills,
        "trainingMap": training,
        "interviewPlan": interview,
        "assessmentPlan": assessment,
        "rubric": rubric,
        "onboardingPlan": onboarding,
        "responsibleAINotes": [
            "This plan is AI-assisted and must be reviewed by HR before use.",
            "ELOT AI does not make final hiring decisions — humans always decide.",
            "No protected attributes (age, race, gender, religion, etc.) are evaluated.",
            "Treat candidate data as sensitive — keep it inside ELOT.",
        ],
    }


# ---------------------------------------------------------------------------
# AI interview fallbacks
# ---------------------------------------------------------------------------
DEFAULT_INTERVIEW_QUESTIONS = [
    {
        "question": "A customer is angry because their package is late. Walk me through how you would handle the conversation.",
        "skillTested": "Communication under pressure",
        "whyThisMatters": "Tests the candidate's ability to stay calm and use neutral language.",
    },
    {
        "question": "A teammate asks you to share customer emails by personal WhatsApp. How do you respond?",
        "skillTested": "Policy & data privacy",
        "whyThisMatters": "Tests whether the candidate will refuse an unsafe request from inside the team.",
    },
    {
        "question": "A customer asks for a $300 refund. What is your process?",
        "skillTested": "Escalation & judgement",
        "whyThisMatters": "Tests whether the candidate recognises the escalation threshold.",
    },
    {
        "question": "Describe a small mistake you made recently. How did you handle it?",
        "skillTested": "Accountability",
        "whyThisMatters": "Reveals self-awareness and ability to learn from errors.",
    },
    {
        "question": "You get an email with a suspicious link asking you to re-enter your login. What's your response?",
        "skillTested": "Security awareness",
        "whyThisMatters": "Tests basic phishing-awareness reflex.",
    },
]


def sample_interview_question(question_number: int, role_profile: dict[str, Any]) -> dict[str, Any]:
    if question_number < 1 or question_number > len(DEFAULT_INTERVIEW_QUESTIONS):
        return {
            "question": "Is there anything else you'd like HR to know about how you'd approach this role?",
            "skillTested": "Self-awareness",
            "whyThisMatters": "Lets the candidate add context HR might want to consider.",
        }
    return DEFAULT_INTERVIEW_QUESTIONS[question_number - 1]


def sample_answer_evaluation(answer: str, question: str) -> dict[str, Any]:
    """Heuristic scoring for the fallback path.

    Looks for safe-response signals (refuse/report/escalate/policy/approved
    channel) and risky signals (forward/share/ok/send/immediately).
    Returns the same JSON shape the LLM is expected to emit.
    """
    text = (answer or "").lower()
    strong = [
        "report",
        "refuse",
        "escalate",
        "manager",
        "policy",
        "approved",
        "security",
        "do not",
        "don't",
    ]
    weak = ["forward", "share", "ok", "sure", "send", "personal"]

    hits = sum(s in text for s in strong)
    weak_hits = sum(s in text for s in weak)

    if hits >= 2 and weak_hits == 0:
        score = 88
        skill_score = 85
        strengths = [
            "Cited policy explicitly",
            "Chose a safe channel / escalation path",
        ]
        weaknesses = ["Could mention documenting the situation."]
        red_flags: list[str] = []
        better = "Refuse the unsafe action, cite the policy, and document/escalate."
    elif hits >= 1:
        score = 65
        skill_score = 62
        strengths = ["Recognised the right direction"]
        weaknesses = [
            "Did not mention escalation or reporting",
            "Could be more explicit about the policy",
        ]
        red_flags = []
        better = "Refuse, point at the policy, suggest the approved channel, and escalate."
    else:
        score = 35
        skill_score = 35
        strengths = ["Engaged with the question"]
        weaknesses = [
            "Did not refuse the unsafe path clearly",
            "No mention of escalation, policy, or reporting",
        ]
        red_flags = ["Could agree to bypass policy under social pressure"]
        better = (
            "Refuse the request, name the policy that applies, escalate to a manager, "
            "and report it to security."
        )

    return {
        "score": score,
        "skillScores": [
            {
                "skill": "Job-related response",
                "score": skill_score,
                "reason": "Based on whether the answer aligns with policy and escalation expectations.",
            }
        ],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "redFlags": red_flags,
        "betterAnswerExample": better,
        "hrReviewNote": (
            "AI-scored answer — HR should review for tone, fit, and any context the "
            "candidate may have lacked in this format."
        ),
    }


def sample_scorecard(candidate: dict[str, Any], training: dict[str, Any], interview: dict[str, Any]) -> dict[str, Any]:
    overall = candidate.get("readiness_score") or interview.get("overall_score") or 60
    if overall >= 80:
        rec = "invite_to_hr_interview"
        summary = (
            f"{candidate.get('full_name', 'Candidate')} performed strongly on training and "
            "AI interview. Consider inviting to the HR interview."
        )
    elif overall >= 55:
        rec = "needs_more_review"
        summary = (
            f"{candidate.get('full_name', 'Candidate')} shows partial readiness. HR should "
            "review the transcript and consider an additional assessment."
        )
    else:
        rec = "not_ready"
        summary = (
            f"{candidate.get('full_name', 'Candidate')} does not yet show the policy and "
            "escalation skills the role needs. Consider re-assigning training first."
        )

    return {
        "overallReadinessScore": overall,
        "recommendation": rec,
        "summary": summary,
        "strengths": [
            "Engaged with all training modules",
            "Recognised the basics of escalation",
        ],
        "weaknesses": [
            "Could be more explicit about data-handling policy",
            "Documentation habit could be stronger",
        ],
        "skillScores": [
            {"skill": "Communication", "score": min(100, overall + 5)},
            {"skill": "Policy & privacy", "score": overall},
            {"skill": "Escalation judgement", "score": max(0, overall - 10)},
            {"skill": "Security awareness", "score": overall},
            {"skill": "Accountability", "score": overall},
        ],
        "riskFlags": [],
        "suggestedHRInterviewQuestions": [
            "Tell me about a time you had to push back on a teammate. How did it go?",
            "What does 'documenting an escalation' look like for you in practice?",
            "How would you explain our refund policy to a frustrated customer?",
        ],
        "recommendedNextSteps": [
            "Review the AI interview transcript before the HR call",
            "Ask the candidate to describe a real escalation they handled",
        ],
        "responsibleAINote": (
            "This is an AI-generated recommendation for HR review, not an automated "
            "hiring decision."
        ),
    }


# ---------------------------------------------------------------------------
# Onboarding fallback
# ---------------------------------------------------------------------------
def sample_onboarding_plan(role_title: str, scorecard: dict[str, Any] | None = None) -> dict[str, Any]:
    weak = (scorecard or {}).get("weaknesses", []) if scorecard else []
    extra_modules: list[dict[str, Any]] = []
    if any("policy" in w.lower() or "data" in w.lower() for w in weak):
        extra_modules.append(
            {
                "title": "Refresher: data-handling policy",
                "type": "data_privacy",
                "description": "Short refresher focused on approved data channels.",
                "lesson": "Customer data may only move through approved company systems.",
                "quiz": [
                    {
                        "question": "Which channel is approved for customer data?",
                        "options": [
                            "Personal email",
                            "Public AI chatbot",
                            "Approved company system",
                            "USB stick",
                        ],
                        "correctAnswer": "Approved company system",
                        "explanation": "Only company-approved systems are allowed.",
                    }
                ],
            }
        )

    base_modules = [
        {
            "title": "Welcome & company structure",
            "type": "company_structure",
            "description": "Org chart, decision rights, and who to ask for what.",
            "lesson": (
                "Every company runs on shared expectations. This module introduces the "
                "structure, where to find documentation, and who your first 30 days will "
                "involve. Bookmark the people you'll work with most."
            ),
            "quiz": [
                {
                    "question": "Where do you escalate something you don't know how to handle?",
                    "options": [
                        "Try silently",
                        "Ask your manager and document it",
                        "Post on social media",
                        "Send a personal email",
                    ],
                    "correctAnswer": "Ask your manager and document it",
                    "explanation": "Escalation + documentation is the safe default in week one.",
                },
            ],
        },
        {
            "title": f"Role onboarding — {role_title}",
            "type": "role_training",
            "description": "Day-in-the-life walkthrough for this specific role.",
            "lesson": (
                f"This module walks through a typical day for a {role_title}. You'll "
                "learn the systems you'll use, who you partner with, and how success "
                "is measured in your first 90 days."
            ),
            "quiz": [
                {
                    "question": "What does 'success in 90 days' usually look like for a new hire?",
                    "options": [
                        "Closing the biggest deal of the year",
                        "Knowing exactly when to escalate vs act",
                        "Avoiding mistakes by doing nothing",
                        "Replacing your manager",
                    ],
                    "correctAnswer": "Knowing exactly when to escalate vs act",
                    "explanation": "Knowing when to act vs escalate is the most important new-hire skill.",
                },
            ],
        },
        {
            "title": "Cybersecurity awareness",
            "type": "security",
            "description": "Phishing, MFA, and how to report a suspicious request.",
            "lesson": (
                "Phishing tries to push you into a fast, unsafe action. Slow down. Never "
                "share MFA codes by voice. Report anything that feels off to the security team."
            ),
            "quiz": [
                {
                    "question": "You receive an email asking you to re-enter your password. You should…",
                    "options": [
                        "Click and re-enter to investigate",
                        "Forward to your team",
                        "Report to security and don't click",
                        "Ignore it",
                    ],
                    "correctAnswer": "Report to security and don't click",
                    "explanation": "Reporting + not clicking is always the right answer.",
                },
            ],
        },
        {
            "title": "Workplace conduct & anti-harassment",
            "type": "harassment",
            "description": "What respectful behaviour looks like — and how to report issues.",
            "lesson": (
                "Everyone at the company is responsible for a respectful workplace. If "
                "you see or experience harassment, you can report it to HR confidentially. "
                "Retaliation is never tolerated."
            ),
            "quiz": [
                {
                    "question": "If you witness harassment, you should…",
                    "options": [
                        "Stay quiet to keep the peace",
                        "Report it to HR confidentially",
                        "Post about it publicly",
                        "Confront the person alone",
                    ],
                    "correctAnswer": "Report it to HR confidentially",
                    "explanation": "Reporting via HR is the safe and supported path.",
                },
            ],
        },
        {
            "title": "Data privacy",
            "type": "data_privacy",
            "description": "Approved channels, customer data, and what to do when in doubt.",
            "lesson": (
                "Customer data may only move through approved company systems. Personal "
                "messengers, personal email, USB drives, and public AI tools are not allowed."
            ),
            "quiz": [
                {
                    "question": "A teammate asks for a customer list via Telegram. You should…",
                    "options": [
                        "Send it — they're a teammate",
                        "Refuse and explain the policy",
                        "Send a partial list",
                        "Ask the customer first",
                    ],
                    "correctAnswer": "Refuse and explain the policy",
                    "explanation": "Personal messengers are not approved for customer data.",
                },
            ],
        },
        {
            "title": "AI usage policy",
            "type": "ai_usage",
            "description": "When AI is allowed at work — and what must never be uploaded.",
            "lesson": (
                "AI tools are great for drafting and exploring. They are not approved for "
                "uploading customer data, internal financials, or anything sensitive. "
                "If in doubt, use the company-approved tool only."
            ),
            "quiz": [
                {
                    "question": "Which of these is safe to paste into a public AI chatbot?",
                    "options": [
                        "Customer emails",
                        "A draft of a public blog post",
                        "Internal financial data",
                        "An employee's salary",
                    ],
                    "correctAnswer": "A draft of a public blog post",
                    "explanation": "Only public, non-sensitive content is safe in public AI tools.",
                },
            ],
        },
    ]

    return {
        "title": f"{role_title} — onboarding plan",
        "modules": base_modules + extra_modules,
        "readinessMilestones": [
            "Completed company-structure quiz",
            "Completed cybersecurity quiz",
            "Completed data-privacy quiz",
            "Completed first 1:1 with manager",
        ],
        "managerChecklist": [
            "Schedule a 1:1 in week one",
            "Pair them with a buddy",
            "Review their first ticket / first task together",
            "Confirm onboarding completion at day 30",
        ],
    }
