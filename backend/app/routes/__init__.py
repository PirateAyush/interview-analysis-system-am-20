from app.routes.auth import auth_bp
from app.routes.organization import org_bp
from app.routes.assessment import assessment_bp

__all__ = ['auth_bp', 'org_bp', 'assessment_bp']