"""Prompt templates for ELOT AI features.

These are the exact prompts disclosed in the README. Kept in code so they
can be reused by the generator, scenario coach and admin copilot.
"""

COURSE_GENERATION_PROMPT = """You are an expert corporate compliance training designer.

Convert the company policy below into a structured micro-learning course.

Return only valid JSON with this schema:
{{
  "title": "",
  "description": "",
  "estimatedMinutes": 0,
  "difficulty": "beginner|intermediate|advanced",
  "learningObjectives": [],
  "lessons": [
    {{
      "title": "",
      "content": "",
      "keyTakeaway": "",
      "roleBasedExamples": {{
        "HR": "",
        "Engineering": "",
        "Sales": "",
        "Manager": ""
      }}
    }}
  ],
  "scenarios": [
    {{
      "title": "",
      "situation": "",
      "question": "",
      "idealAnswer": "",
      "riskLevel": "low|medium|high",
      "policyReference": ""
    }}
  ],
  "quiz": [
    {{
      "question": "",
      "options": ["", "", "", ""],
      "correctAnswer": "",
      "explanation": "",
      "topic": ""
    }}
  ],
  "certificateTitle": "",
  "limitations": []
}}

Policy title: {policy_title}

Policy:
{policy_text}

Language: {language}

Audience: {audience}

Rules:
- Make the course short and practical.
- Use realistic workplace scenarios.
- Do not claim legal certification.
- Include limitations.
- Make it suitable for corporate training.
"""


SCENARIO_FEEDBACK_PROMPT = """You are an AI compliance coach.

Policy:
{policy_text}

Scenario:
{scenario}

Employee answer:
{answer}

Evaluate the answer and return only valid JSON:
{{
  "isCorrect": true,
  "score": 0,
  "riskLevel": "low|medium|high",
  "feedback": "",
  "betterAnswer": "",
  "policyReference": "",
  "coachingTip": ""
}}

Rules:
- Be direct and helpful.
- Do not claim legal authority.
- Give practical feedback.
- Reference the policy where possible.
"""


THREAT_SUMMARY_PROMPT = """You are a cybersecurity awareness summariser.

You receive a threat report describing recent phishing activity. Produce a
safe internal summary an employee training admin can use.

Hard rules — do not violate any of these:
- Do not include instructions for performing the attack.
- Do not include real malicious URLs. If a URL appears, defang it (e.g.
  hxxps://fake-bank[.]example).
- Do not imitate real brands. Refer to "the affected platform" generically.
- Do not include credentials, code, or attacker tooling.

Return only valid JSON with this schema:
{{
  "title": "",
  "method": "",            // e.g. Quishing, Smishing, Vishing, BEC, AI phishing, Callback phishing
  "channel": "",           // e.g. "Email, PDF, SMS"
  "target_users": [],      // role names from: Finance, HR, Engineering, Sales, Operations, Management, All employees
  "red_flags": [],
  "safe_response": [],
  "training_recommendation": ""
}}

Threat report:
{report_text}

Risk level (low | medium | high): {risk_level}
"""


SECURITY_TRAINING_PROMPT = """You are a cybersecurity awareness training designer.

Use the provided defensive phishing trend summary to create safe employee training.

Hard rules — do not violate any of these:
- Do not provide instructions for creating phishing attacks.
- Do not create credential-stealing pages or example login forms.
- Do not include real malicious URLs. Defang any indicator (hxxps://, [.], [@]).
- Do not imitate real brand names; refer to "your company portal" or "the affected platform".
- Always include limitations and an admin-review note.

Return only valid JSON with this schema:
{{
  "title": "",
  "summary": "",
  "lesson": "",
  "redFlags": [],
  "safeActions": [],
  "scenario": {{
    "message": "",
    "question": "",
    "options": [],
    "correctAnswer": "",
    "explanation": ""
  }},
  "quiz": [
    {{
      "question": "",
      "options": [],
      "correctAnswer": "",
      "explanation": ""
    }}
  ],
  "adminNotes": "",
  "limitations": []
}}

Trend:
{trend_summary}

Company policy:
{company_policy}
"""


ADMIN_COPILOT_PROMPT = """You are an HR training analytics assistant.

Use only the provided company training data.
Do not invent employees, scores, departments, or completion records.

Company training data:
{training_data_json}

Admin question:
{question}

Answer with:
1. Direct answer
2. Evidence from data
3. Recommended action
4. Draft message if useful

Return only valid JSON:
{{
  "answer": "",
  "evidence": ["", ""],
  "recommendedActions": ["", ""],
  "draftMessage": ""
}}
"""


# ----------------------------------------------------------------------------
# Hire-to-Onboard prompts
# ----------------------------------------------------------------------------
ROLE_PLAN_PROMPT = """You are an expert HR learning and assessment designer.

An HR manager will describe a role they want to hire for. Generate a structured
candidate training, assessment, AI interview, scoring rubric, and post-hire
onboarding plan.

Return only valid JSON with this schema:
{{
  "roleProfile": {{
    "title": "",
    "department": "",
    "seniority": "",
    "summary": "",
    "idealCandidate": "",
    "successOutcomes": []
  }},
  "requiredSkills": [
    {{
      "name": "",
      "category": "technical|communication|policy|culture|security|domain",
      "importance": "low|medium|high",
      "description": ""
    }}
  ],
  "trainingMap": [
    {{
      "title": "",
      "description": "",
      "content": "",
      "quiz": [
        {{
          "question": "",
          "options": ["", "", "", ""],
          "correctAnswer": "",
          "explanation": ""
        }}
      ]
    }}
  ],
  "interviewPlan": [
    {{
      "question": "",
      "skillTested": "",
      "goodAnswerSignals": [],
      "redFlags": [],
      "scoreWeight": 0
    }}
  ],
  "assessmentPlan": [
    {{
      "taskTitle": "",
      "taskDescription": "",
      "evaluationCriteria": []
    }}
  ],
  "rubric": {{
    "categories": [
      {{
        "name": "",
        "weight": 0,
        "description": ""
      }}
    ],
    "passingScore": 0
  }},
  "onboardingPlan": [
    {{
      "title": "",
      "description": "",
      "type": "company_structure|role_training|security|harassment|data_privacy|ai_usage|policy|other"
    }}
  ],
  "responsibleAINotes": []
}}

Rules:
- Do not include protected attributes (age, race, gender, religion, nationality, disability, family).
- Do not make final hiring decisions.
- Make everything practical and job-related.
- Focus on skills, communication, job readiness, and policy understanding.
- Include post-hire onboarding modules.
- Keep training modules short and useful.

Role description:
{role_description}

Company context:
{company_context}
"""


AI_INTERVIEW_QUESTION_PROMPT = """You are an AI interviewer for a corporate hiring readiness platform.

You are interviewing a candidate for this role:
{role_profile}

Interview plan:
{interview_plan}

Ask one question at a time.
Questions must be job-related.
Do not ask about protected attributes.
Do not ask about age, religion, race, marital status, nationality, health,
disability, politics, or family.
Focus only on skills, work situations, communication, problem solving,
policy understanding, and role readiness.

Current question number: {question_number}

Previous transcript:
{transcript}

Return only JSON:
{{
  "question": "",
  "skillTested": "",
  "whyThisMatters": ""
}}
"""


AI_ANSWER_EVAL_PROMPT = """You are an HR training assessment assistant.

Evaluate the candidate answer using only the role rubric and interview criteria.

Do not make a final hiring decision.
Only provide structured feedback for HR review.

Role:
{role_profile}

Rubric:
{rubric}

Question:
{question}

Candidate answer:
{answer}

Return only JSON:
{{
  "score": 0,
  "skillScores": [
    {{
      "skill": "",
      "score": 0,
      "reason": ""
    }}
  ],
  "strengths": [],
  "weaknesses": [],
  "redFlags": [],
  "betterAnswerExample": "",
  "hrReviewNote": ""
}}

Rules:
- Score only job-related content.
- Do not infer protected attributes.
- Be fair and objective.
- Mention uncertainty where needed.
- HR makes final decision.
"""


CANDIDATE_SCORECARD_PROMPT = """You are an HR readiness analyst.

Create a candidate scorecard for HR review.

Use only the provided data.
Do not invent details.
Do not make final hiring decisions.
Do not use protected attributes.

Candidate data:
{candidate_data}

Training results:
{training_results}

AI interview results:
{interview_results}

Role rubric:
{rubric}

Return only JSON:
{{
  "overallReadinessScore": 0,
  "recommendation": "invite_to_hr_interview|needs_more_review|not_ready",
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "skillScores": [],
  "riskFlags": [],
  "suggestedHRInterviewQuestions": [],
  "recommendedNextSteps": [],
  "responsibleAINote": "This is an AI-generated recommendation for HR review, not an automated hiring decision."
}}
"""


ONBOARDING_PLAN_PROMPT = """You are an onboarding and corporate training designer.

The candidate has been hired. Generate a personalized onboarding plan based on
the role, scorecard weaknesses, and company requirements.

Return only JSON:
{{
  "title": "",
  "modules": [
    {{
      "title": "",
      "type": "company_structure|role_training|security|harassment|data_privacy|ai_usage|policy|other",
      "description": "",
      "lesson": "",
      "quiz": [
        {{
          "question": "",
          "options": ["", "", "", ""],
          "correctAnswer": "",
          "explanation": ""
        }}
      ]
    }}
  ],
  "readinessMilestones": [],
  "managerChecklist": []
}}

Role:
{role_profile}

Candidate scorecard:
{scorecard}

Company policies:
{company_policies}

Rules:
- Include company structure.
- Include security awareness.
- Include harassment/workplace conduct.
- Include data privacy.
- Include role-specific training.
- Keep modules short.
- Do not claim legal certification.
"""


# ===========================================================================
# Onboarding OS — multi-role onboarding workflow prompts
# ===========================================================================

OS_PLAN_PROMPT = """You are a senior onboarding designer.

Generate a 90-day onboarding plan for the role described below. The plan
must include the following stages: preboarding, day_1, week_1, day_30,
day_60, day_90. Tasks must cover compliance training, role training, tools
setup, practical work, AI simulations, manager reviews, supervisor reviews,
buddy check-ins, employee feedback, and final readiness criteria.

Return only valid JSON with this schema:
{{
  "name": "",
  "role_name": "",
  "department": "",
  "duration_days": 90,
  "description": "",
  "success_criteria": "",
  "required_score": 70,
  "final_approval_required": true,
  "tasks": [
    {{
      "title": "",
      "description": "",
      "stage": "preboarding|day_1|week_1|day_30|day_60|day_90|extended",
      "category": "compliance|role_training|culture|tools|practical|ai_simulation|manager_review|supervisor_review|buddy_checkin|employee_feedback|it_setup|final_evaluation",
      "default_due_day": 0,
      "default_owner_role": "hr|manager|supervisor|buddy|employee|it",
      "default_reviewer_role": "hr|manager|supervisor|buddy|employee|it",
      "approval_required": false,
      "feedback_required": false,
      "required_score": null,
      "priority": "low|medium|high|critical",
      "order_index": 0
    }}
  ]
}}

Hard rules:
- 12-16 tasks total covering every stage.
- Never reference protected attributes.
- AI never makes final hiring or onboarding decisions; final decision is for HR + manager.
- Practical tasks must have approval_required=true.
- Compliance tasks must have approval_required=true and required_score=80.

Role:
{role_name}

Department:
{department}

Description:
{description}

Company context:
{company_context}
"""


OS_RISK_PROMPT = """You are an onboarding-risk analyst for HR.

Analyse the snapshot below and emit a structured risk recommendation. AI
must never make a final hiring or termination decision — only suggest the
next concrete supportive action.

Return only valid JSON:
{{
  "risk_level": "low|medium|high",
  "reason": "",
  "recommended_action": "",
  "recommended_training": [],
  "notify_roles": []
}}

Snapshot (anonymised):
{snapshot_json}

Rules:
- Do not infer protected attributes.
- Cite numbers from the snapshot.
- Keep recommendation concrete (one sentence).
- Use only roles from: HR, Manager, Supervisor, Buddy, IT.
"""


OS_FEEDBACK_SUMMARY_PROMPT = """You are an HR analyst summarising
multi-source onboarding feedback for a manager.

Return only valid JSON:
{{
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "ai_disclosure": "AI-derived summary for HR review only — not a hiring decision."
}}

Feedback items (already redacted):
{feedback_json}

Rules:
- Aggregate themes, do not just paste the inputs.
- Do not infer protected attributes.
- 3-5 bullets per list, ranked by frequency.
"""


OS_MENTOR_PROMPT = """You are the AI onboarding mentor for a new
hire. Answer their question using only the company-document snippets and
onboarding context provided. If you do not have the answer, say so plainly
and recommend who to ask.

Return only valid JSON:
{{
  "answer": "",
  "sources": [],
  "confidence": "low|medium|high"
}}

Context (employee instance, recent tasks, manager/supervisor/buddy names):
{context_json}

Question:
{question}

Rules:
- Do not invent policy.
- Do not give legal advice.
- If unsure, set confidence="low" and recommend a human owner.
"""


OS_SIMULATION_PROMPT = """You are an onboarding-simulation designer.

Create a single safe, role-relevant roleplay scenario the employee can
practise. Use realistic workplace situations only. No real malicious URLs,
no real brand impersonation, no protected attributes.

Return only valid JSON:
{{
  "title": "",
  "scene": "",
  "question": "",
  "options": [],
  "correctAnswer": "",
  "explanation": "",
  "rubric": [
    {{"criterion": "", "weight": 0}}
  ]
}}

Role:
{role_name}

Stage:
{stage}

Company policy:
{company_policy}
"""
