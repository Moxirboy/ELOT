"""Canned, safe-to-show phishing-awareness trend data.

These act as both:
- A fallback when no network or AI key is available
- The seed content for the demo Threat Intelligence page

All URLs in this module are already defanged. The summaries are written so
they describe attacker behaviour without explaining how to perform the attack.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any


def _hours_ago(h: int) -> datetime:
    return datetime.now(UTC) - timedelta(hours=h)


SAMPLE_SOURCES: list[dict[str, Any]] = [
    {
        "name": "CISA Phishing Advisories",
        "source_type": "rss",
        "url": "https[:]//www[.]cisa[.]gov/uscert/ncas/current-activity[.]xml",
    },
    {
        "name": "Anti-Phishing Working Group — Public Trends",
        "source_type": "feed",
        "url": "https[:]//apwg[.]org/trendsreports",
    },
    {
        "name": "ELOT Curated Bulletin",
        "source_type": "sample",
        "url": "",
    },
]


SAMPLE_TREND_BUNDLES: list[dict[str, Any]] = [
    {
        "report": {
            "title": "QR code phishing campaigns ('quishing') targeting payroll and password resets",
            "summary": (
                "Attackers are sending emails and PDFs with QR codes that, when scanned on a "
                "personal phone, lead to a credential-collection page off the corporate network. "
                "Common pretexts: payroll bank-detail confirmation, expiring password, "
                "shared-document access. Defanged example: hxxps://payroll-update[.]example[.]com."
            ),
            "raw_content": (
                "Reports across multiple sectors show QR codes being embedded into emails and "
                "PDF attachments. Because the URL is hidden behind the QR image, traditional "
                "email link-protection tools miss the request. When users scan the QR with a "
                "personal device, the request bypasses corporate web filters. Example bait: "
                "'Scan to confirm your salary account before payroll cutoff.'"
            ),
            "source_url": "https[:]//www[.]example[.]org/quishing-trend",
            "confidence_score": 85,
            "published_at": _hours_ago(18),
        },
        "summary": {
            "title": "QR Code Phishing Is Increasing",
            "method": "Quishing",
            "channel": "Email, PDF, posters, SMS",
            "target_users": ["Finance", "HR", "All employees"],
            "red_flags": [
                "Unexpected QR code in an email or PDF",
                "Urgent payroll, password reset, or shared-doc pretext",
                "Login page that opens on a personal phone",
                "Branding looks slightly off versus the real portal",
            ],
            "safe_response": [
                "Do not scan unexpected QR codes",
                "Open the official company portal manually in your browser",
                "Confirm payroll requests through HR via a known channel",
                "Report the message to IT / security",
            ],
            "training_recommendation": (
                "Create a 5-minute micro-training for all employees and prioritise Finance + HR."
            ),
        },
        "risk_level": "high",
    },
    {
        "report": {
            "title": "SMS phishing ('smishing') impersonating delivery and bank notifications",
            "summary": (
                "Targets receive SMS messages claiming a missed package or blocked card and "
                "are pushed to a short-lived domain. Recent examples used defanged short links "
                "like hxxps://uspack-tracking[.]example[.]net."
            ),
            "raw_content": (
                "SMS phishing volume rose noticeably this quarter. Messages mimic shipping "
                "carriers and bank fraud alerts. Targets land on pages that ask for full card "
                "details or one-time codes. Because phones display only the short URL, the "
                "domain mismatch is hard to notice."
            ),
            "source_url": "https[:]//www[.]example[.]org/smishing-trend",
            "confidence_score": 78,
            "published_at": _hours_ago(40),
        },
        "summary": {
            "title": "Smishing With Delivery + Bank Pretexts",
            "method": "Smishing",
            "channel": "SMS, messaging apps",
            "target_users": ["All employees", "Remote staff", "Field staff"],
            "red_flags": [
                "Unsolicited SMS with a short link",
                "Request to confirm card or one-time code",
                "Urgency around a delivery or 'blocked' card",
                "Sender ID does not match the brand",
            ],
            "safe_response": [
                "Do not tap unsolicited links",
                "Open the carrier or bank app directly",
                "Never share a one-time code over SMS",
                "Forward suspicious SMS to security",
            ],
            "training_recommendation": (
                "Run a 3-minute refresher for all employees with one in-app smishing challenge."
            ),
        },
        "risk_level": "medium",
    },
    {
        "report": {
            "title": "Voice phishing ('vishing') with helpdesk impersonation",
            "summary": (
                "Callers impersonate internal IT support and push targets to install remote-"
                "support tools, share MFA codes, or read out password reset links."
            ),
            "raw_content": (
                "Multiple incident reports describe phone calls from spoofed extensions. The "
                "caller cites a 'security incident' to rush the victim. Common asks: open a "
                "remote-support session, read out an MFA code, click a reset link sent via SMS."
            ),
            "source_url": "https[:]//www[.]example[.]org/vishing-helpdesk",
            "confidence_score": 72,
            "published_at": _hours_ago(60),
        },
        "summary": {
            "title": "Helpdesk Impersonation Calls",
            "method": "Vishing",
            "channel": "Phone, Teams / Zoom calls",
            "target_users": ["IT helpdesk callers", "Finance", "Executive assistants"],
            "red_flags": [
                "Urgency from 'internal IT'",
                "Request to install remote-support software",
                "Request to read out an MFA code",
                "Caller refuses to wait for a callback through known channel",
            ],
            "safe_response": [
                "Hang up and call IT back via the known extension",
                "Never share an MFA code by voice",
                "Refuse to install remote-support tools mid-call",
                "Open an incident ticket immediately",
            ],
            "training_recommendation": (
                "Quarterly 5-minute refresher; one in-app role-play for IT-adjacent staff."
            ),
        },
        "risk_level": "high",
    },
    {
        "report": {
            "title": "Business Email Compromise — vendor invoice + payment redirection",
            "summary": (
                "Attackers compromise or spoof a vendor's mailbox to send 'updated banking "
                "details' before a scheduled payment. The thread looks like a legitimate "
                "ongoing conversation."
            ),
            "raw_content": (
                "BEC schemes continue to favour the slow burn — quiet inbox access, then a "
                "single high-impact ask to redirect a payment. Often timed to the end of the "
                "month or fiscal quarter."
            ),
            "source_url": "https[:]//www[.]example[.]org/bec-vendor",
            "confidence_score": 90,
            "published_at": _hours_ago(8),
        },
        "summary": {
            "title": "Vendor Payment-Redirection BEC",
            "method": "BEC / fake invoice",
            "channel": "Email thread",
            "target_users": ["Finance", "Accounts payable", "Operations"],
            "red_flags": [
                "Last-minute change to vendor bank details",
                "Pressure to pay before month-end",
                "Reply-to address subtly different from previous emails",
                "Vendor unwilling to confirm on a known phone number",
            ],
            "safe_response": [
                "Always confirm bank-detail changes via a known phone number",
                "Require a second approver on changes to vendor banking",
                "Compare against the vendor record on file",
                "Report the request to security / finance lead",
            ],
            "training_recommendation": (
                "Mandatory 10-minute training for all Finance + AP staff."
            ),
        },
        "risk_level": "high",
    },
    {
        "report": {
            "title": "AI-generated phishing emails with near-perfect grammar",
            "summary": (
                "Generative AI is being used to clean up phishing prose, remove obvious "
                "spelling tells, and personalise to the target's role. The legacy advice "
                "'look for typos' no longer applies."
            ),
            "raw_content": (
                "Threat intel reports describe phishing kits packaged with LLM helpers. "
                "Operators can paste a target's name, employer, and role into a template "
                "and receive a personalised, well-written lure within seconds."
            ),
            "source_url": "https[:]//www[.]example[.]org/ai-phishing-quality",
            "confidence_score": 80,
            "published_at": _hours_ago(30),
        },
        "summary": {
            "title": "AI-Polished Phishing — 'No Typos' Era",
            "method": "AI-generated phishing",
            "channel": "Email, chat, LinkedIn",
            "target_users": ["All employees", "Executives", "Engineering"],
            "red_flags": [
                "Unusually specific personalisation",
                "Polished writing but unexpected payment / login ask",
                "Sender domain doesn't match the company",
                "Asks you to break a documented policy",
            ],
            "safe_response": [
                "Judge by behaviour, not grammar",
                "Verify any out-of-process ask via a known channel",
                "Report to security if anything feels off",
                "Hover to inspect every link before clicking",
            ],
            "training_recommendation": (
                "Replace the 'look for typos' module with a behaviour-based test."
            ),
        },
        "risk_level": "medium",
    },
    {
        "report": {
            "title": "Callback phishing — the 'call us back' invoice scam",
            "summary": (
                "Targets receive an email claiming a subscription renewal and a phone number "
                "to call. The number is staffed by attackers who walk the target through "
                "installing remote-support tools."
            ),
            "raw_content": (
                "This pattern combines email + voice. Because no URL is clicked, traditional "
                "link scanners miss it. The attacker's leverage is the phone call, where they "
                "create urgency and confusion."
            ),
            "source_url": "https[:]//www[.]example[.]org/callback-phishing",
            "confidence_score": 76,
            "published_at": _hours_ago(54),
        },
        "summary": {
            "title": "Callback Phishing With Fake Renewals",
            "method": "Callback phishing",
            "channel": "Email + phone",
            "target_users": ["Operations", "Procurement", "IT-adjacent staff"],
            "red_flags": [
                "Unexpected subscription renewal email with a phone number",
                "Request to call back urgently to 'cancel'",
                "Caller wants to install remote-support tools",
                "Pressure to act before invoice is 'charged'",
            ],
            "safe_response": [
                "Do not call numbers from unsolicited emails",
                "Look up the vendor's official support number yourself",
                "Refuse remote-support requests outside official process",
                "Forward the email to security for review",
            ],
            "training_recommendation": (
                "5-minute training for Procurement + Operations; quarterly refresher."
            ),
        },
        "risk_level": "medium",
    },
]


def sample_training_for_trend(trend_title: str, method: str) -> dict[str, Any]:
    """Build a deterministic, safe training payload from a trend.

    Mirrors the structure the AI training generator returns.
    """
    return {
        "title": f"{trend_title} — 3-minute training",
        "summary": (
            f"A short, safe employee training explaining {method.lower()} in plain language "
            "and the correct response. AI-generated; admin must review before publishing."
        ),
        "lesson": (
            f"What it is: {method} attackers try to push you into an unsafe action by faking "
            "an internal or external authority. Why it matters: even a single click can give "
            "the attacker access to customer data or payments. What we do at this company: "
            "we never confirm sensitive actions through unexpected channels, and we always "
            "report suspicious requests to IT / security."
        ),
        "redFlags": [
            "Unexpected urgency about money, access, or login",
            "Channel switch you did not initiate (call → email, email → SMS)",
            "Request to break a documented policy 'just this once'",
            "Sender name looks right but address or domain is off",
        ],
        "safeActions": [
            "Slow down — urgency is the most common attack signal",
            "Verify via a known, trusted channel (not the one the request arrived on)",
            "Report suspected attacks to security immediately",
            "Never share MFA codes, passwords, or banking details by voice / SMS",
        ],
        "scenario": {
            "message": (
                f"You receive a message that uses {method.lower()} techniques: it pressures "
                "you to confirm a sensitive action through an unexpected channel."
            ),
            "question": "What is the safest first step?",
            "options": [
                "Comply with the request to avoid delay",
                "Forward the message to your team for opinions",
                "Verify through a known internal channel before acting",
                "Reply asking the sender to confirm",
            ],
            "correctAnswer": "Verify through a known internal channel before acting",
            "explanation": (
                "Verifying through a known channel breaks the attacker's leverage. "
                "Replying to the same message lets the attacker keep controlling the conversation."
            ),
        },
        "quiz": [
            {
                "question": f"Which of these is a typical {method.lower()} red flag?",
                "options": [
                    "A scheduled meeting on your calendar",
                    "Urgent request from an unexpected channel",
                    "An email signed by your manager",
                    "A confirmation from your IT ticket",
                ],
                "correctAnswer": "Urgent request from an unexpected channel",
                "explanation": (
                    "Channel switches plus urgency is one of the most reliable signals."
                ),
            },
            {
                "question": "If something feels wrong, when should you report it?",
                "options": [
                    "At the end of the quarter",
                    "Only if it caused damage",
                    "Immediately",
                    "Never — it might cause trouble",
                ],
                "correctAnswer": "Immediately",
                "explanation": "Early reporting limits damage and is never penalised.",
            },
            {
                "question": "If a caller insists you install remote-support software, you should…",
                "options": [
                    "Install it to be helpful",
                    "Ask the caller for their email",
                    "Hang up and call IT back via the known number",
                    "Share your screen so they can confirm",
                ],
                "correctAnswer": "Hang up and call IT back via the known number",
                "explanation": (
                    "Hanging up and re-establishing contact through a trusted channel is the "
                    "single most effective defence against vishing."
                ),
            },
        ],
        "adminNotes": (
            "AI-generated. Review wording for your company tone before publishing. "
            "Targeting recommendation: prioritise high-risk roles for the first wave."
        ),
        "limitations": [
            "This is AI-generated training and must be reviewed by an admin before publishing.",
            "Not legal or regulatory advice — confirm policy claims with your compliance team.",
            "Do not use real malicious URLs or imitate real brands in tests.",
            "Defanged indicators are not safe to copy back into live email systems.",
        ],
    }
