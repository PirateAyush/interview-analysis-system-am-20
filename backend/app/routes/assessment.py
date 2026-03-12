import requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Assessment, AssessmentQuestion

assessment_bp = Blueprint('assessment', __name__)

# FastAPI AI service URL — override via AI_SERVICE_URL env var in production
AI_SERVICE_URL = 'http://localhost:8000'


def _get_ai_service_url():
    return current_app.config.get('AI_SERVICE_URL', AI_SERVICE_URL)


# ── POST /api/assessment/analyze ──────────────────────────────────────────────
@assessment_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze():
    """
    Receives a transcript file + metadata from the React frontend,
    forwards to the FastAPI AI service, saves the result to PostgreSQL,
    and returns the full report.

    Form fields:
        file              – .txt transcript file
        interviewer_name  – must match speaker label in transcript
        candidate_name    – must match speaker label in transcript
        applied_role      – e.g. "iOS Software Engineer"
        candidate_level   – Junior | Mid | Senior
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # ── Validate form fields ───────────────────────────────────────────────────
    required_fields = ['interviewer_name', 'candidate_name', 'applied_role', 'candidate_level']
    for field in required_fields:
        if not request.form.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'Transcript file is required'}), 400

    file = request.files['file']
    if not file.filename.endswith('.txt'):
        return jsonify({'error': 'Only .txt transcript files are accepted'}), 400

    candidate_level = request.form.get('candidate_level')
    if candidate_level not in ('Junior', 'Mid', 'Senior'):
        return jsonify({'error': 'candidate_level must be Junior, Mid, or Senior'}), 400

    # ── Create a pending Assessment record ────────────────────────────────────
    assessment = Assessment(
        created_by       = user.id,
        organization_id  = user.organization_id,
        candidate_name   = request.form.get('candidate_name').strip(),
        interviewer_name = request.form.get('interviewer_name').strip(),
        applied_role     = request.form.get('applied_role').strip(),
        candidate_level  = candidate_level,
        status           = 'pending',
    )
    db.session.add(assessment)
    db.session.commit()

    # ── Forward to FastAPI AI service ─────────────────────────────────────────
    try:
        file.stream.seek(0)
        ai_response = requests.post(
            f'{_get_ai_service_url()}/analyze',
            files={'file': (file.filename, file.stream, 'text/plain')},
            data={
                'interviewer_name': request.form.get('interviewer_name'),
                'candidate_name':   request.form.get('candidate_name'),
                'applied_role':     request.form.get('applied_role'),
                'candidate_level':  candidate_level,
            },
            timeout=1200,   # LLaMA3 can be slow — allow up to 15 minutes
        )

        if not ai_response.ok:
            error_msg = ai_response.json().get('error', 'AI service error')
            assessment.status = 'failed'
            assessment.error  = error_msg
            db.session.commit()
            return jsonify({'error': error_msg}), 502

        report = ai_response.json()

    except requests.exceptions.ConnectionError:
        assessment.status = 'failed'
        assessment.error  = 'AI service is not reachable. Is the FastAPI server running on port 8000?'
        db.session.commit()
        return jsonify({'error': assessment.error}), 503

    except requests.exceptions.Timeout:
        assessment.status = 'failed'
        assessment.error  = 'AI service timed out after 15 minutes. Try a shorter transcript.'
        db.session.commit()
        return jsonify({'error': assessment.error}), 504

    except Exception as e:
        assessment.status = 'failed'
        assessment.error  = str(e)
        db.session.commit()
        return jsonify({'error': str(e)}), 500

    # ── Persist report to database ────────────────────────────────────────────
    try:
        assessment.candidate_score    = report.get('candidate_score')
        assessment.interviewer_score  = report.get('interviewer_score')
        assessment.fairness_score     = report.get('fairness_score')
        assessment.hire_recommendation = report.get('hire_recommendation')
        assessment.summary            = report.get('summary')
        assessment.status             = 'completed'

        for qa in report.get('question_analyses', []):
            question = AssessmentQuestion(
                assessment_id   = assessment.id,
                question        = qa.get('question', ''),
                answer          = qa.get('answer', ''),
                domain          = qa.get('domain'),
                seniority_level = qa.get('seniority_level'),
                is_relevant     = qa.get('is_relevant', True),
                is_technical    = qa.get('is_technical', True),
                answer_score    = qa.get('answer_score'),
                answer_level    = qa.get('answer_level'),
                feedback        = qa.get('feedback'),
            )
            db.session.add(question)

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        # Report still generated — return it even if DB save failed
        print(f'[Assessment] DB save error: {e}')

    # ── Return full report + our DB id ────────────────────────────────────────
    return jsonify({
        **report,
        'assessment_id': assessment.id,
    }), 200


# ── GET /api/assessment/history ───────────────────────────────────────────────
@assessment_bp.route('/history', methods=['GET'])
@jwt_required()
def history():
    """
    Returns paginated assessment history for the current user's organization.

    Query params:
        page      – page number (default 1)
        per_page  – results per page (default 10, max 50)
        status    – filter by status: pending | completed | failed
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    page     = request.args.get('page',     1,  type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    status   = request.args.get('status')

    query = Assessment.query.filter_by(organization_id=user.organization_id)

    if status:
        query = query.filter_by(status=status)

    query = query.order_by(Assessment.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'assessments': [a.to_dict() for a in paginated.items],
        'pagination': {
            'page':       paginated.page,
            'per_page':   paginated.per_page,
            'total':      paginated.total,
            'pages':      paginated.pages,
            'has_next':   paginated.has_next,
            'has_prev':   paginated.has_prev,
        }
    }), 200


# ── GET /api/assessment/<id> ──────────────────────────────────────────────────
@assessment_bp.route('/<int:assessment_id>', methods=['GET'])
@jwt_required()
def get_assessment(assessment_id):
    """
    Returns a single assessment with full question breakdown.
    Only accessible by members of the same organization.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    assessment = Assessment.query.get(assessment_id)

    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    if assessment.organization_id != user.organization_id:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(assessment.to_dict(include_questions=True)), 200


# ── DELETE /api/assessment/<id> ───────────────────────────────────────────────
@assessment_bp.route('/<int:assessment_id>', methods=['DELETE'])
@jwt_required()
def delete_assessment(assessment_id):
    """
    Deletes an assessment. Only the creator or an admin can delete.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    assessment = Assessment.query.get(assessment_id)

    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    if assessment.organization_id != user.organization_id:
        return jsonify({'error': 'Access denied'}), 403

    is_creator = assessment.created_by == user.id
    is_admin   = user.type == 'admin'

    if not (is_creator or is_admin):
        return jsonify({'error': 'Only the creator or an admin can delete this assessment'}), 403

    db.session.delete(assessment)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Assessment deleted'}), 200