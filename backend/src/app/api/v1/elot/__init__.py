"""ELOT AI v1 routes."""

from fastapi import APIRouter

from .ai import router as ai_router
from .assignments import router as assignments_router
from .auth import router as auth_router
from .candidate_portal import interview_router as candidate_interview_router
from .candidate_portal import portal_router as candidate_portal_router
from .candidates import dashboard_router as hiring_dashboard_router
from .candidates import router as candidates_router
from .certificates import router as certificates_router
from .companies import router as companies_router
from .courses import router as courses_router
from .dashboard import router as dashboard_router
from .employees import router as employees_router
from .job_roles import ai_router as hiring_ai_router
from .job_roles import router as job_roles_router
from .learner import router as learner_router
from .onboarding import (
    candidate_convert_router as onboarding_candidate_router,
    router as onboarding_router,
)
from .onboarding_os import router as onboarding_os_router
from .phishing import dashboard_router as security_dashboard_router
from .phishing import router as phishing_router
from .policies import router as policies_router
from .threats import router as threats_router

elot_router = APIRouter()
elot_router.include_router(auth_router)
elot_router.include_router(companies_router)
elot_router.include_router(employees_router)
elot_router.include_router(policies_router)
elot_router.include_router(courses_router)
elot_router.include_router(assignments_router)
elot_router.include_router(learner_router)
elot_router.include_router(dashboard_router)
elot_router.include_router(security_dashboard_router)
elot_router.include_router(hiring_dashboard_router)
elot_router.include_router(certificates_router)
elot_router.include_router(ai_router)
elot_router.include_router(hiring_ai_router)
elot_router.include_router(threats_router)
elot_router.include_router(phishing_router)
elot_router.include_router(job_roles_router)
elot_router.include_router(candidates_router)
elot_router.include_router(candidate_portal_router)
elot_router.include_router(candidate_interview_router)
elot_router.include_router(onboarding_router)
elot_router.include_router(onboarding_candidate_router)
elot_router.include_router(onboarding_os_router)
