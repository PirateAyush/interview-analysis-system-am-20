import requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
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

# ── GET /api/assessment/analytics ─────────────────────────────────────────────
@assessment_bp.route('/analytics', methods=['GET'])
@jwt_required()
def analytics():
    """
    Returns org-level and per-interviewer analytics for the dashboard.

    Org-level metrics:
      - total_assessments, avg scores, hire distribution
      - total tech questions, off-role questions & percentage

    Per-interviewer metrics (same set, grouped by interviewer_name):
      - sorted by total_assessments desc
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    org_id = user.organization_id

    # ── All completed assessments for this org ────────────────────────────────
    assessments = (
        Assessment.query
        .filter_by(organization_id=org_id, status='completed')
        .all()
    )

    if not assessments:
        return jsonify({
            'organization': _empty_org_stats(),
            'interviewers': []
        }), 200

    assessment_ids = [a.id for a in assessments]

    # ── All questions for those assessments ───────────────────────────────────
    questions = (
        AssessmentQuestion.query
        .filter(AssessmentQuestion.assessment_id.in_(assessment_ids))
        .all()
    )

    # ── Build org-level stats ─────────────────────────────────────────────────
    org_stats = _compute_stats(assessments, questions)

    # ── Build per-interviewer stats ───────────────────────────────────────────
    # Group assessments by interviewer name
    interviewer_map = {}
    for a in assessments:
        name = a.interviewer_name or 'Unknown'
        interviewer_map.setdefault(name, []).append(a)

    # Map questions by assessment_id for quick lookup
    q_by_assessment = {}
    for q in questions:
        q_by_assessment.setdefault(q.assessment_id, []).append(q)

    interviewers = []
    for name, iv_assessments in interviewer_map.items():
        iv_ids = {a.id for a in iv_assessments}
        iv_questions = [q for q in questions if q.assessment_id in iv_ids]
        stats = _compute_stats(iv_assessments, iv_questions)
        stats['interviewer_name'] = name
        interviewers.append(stats)

    # Sort by most assessments first
    interviewers.sort(key=lambda x: x['total_assessments'], reverse=True)

    return jsonify({
        'organization': org_stats,
        'interviewers': interviewers
    }), 200


def _empty_org_stats():
    return {
        'total_assessments': 0,
        'avg_candidate_score': None,
        'avg_interviewer_score': None,
        'avg_fairness_score': None,
        'hire_distribution': {'Hire': 0, 'Maybe': 0, 'No Hire': 0, 'Inconclusive': 0},
        'hire_rate_pct': None,
        'total_tech_questions': 0,
        'off_role_questions': 0,
        'off_role_pct': None,
        'avg_questions_per_interview': None,
        'level_distribution': {'Junior': 0, 'Mid': 0, 'Senior': 0},
        'domain_distribution': {},
    }


def _compute_stats(assessments, questions):
    """
    Given a list of Assessment objects and their AssessmentQuestion objects,
    return a unified stats dict used for both org-level and interviewer-level analytics.
    """
    total = len(assessments)

    # Score averages (skip None values)
    cand_scores = [a.candidate_score for a in assessments if a.candidate_score is not None]
    iv_scores   = [a.interviewer_score for a in assessments if a.interviewer_score is not None]
    fair_scores = [a.fairness_score for a in assessments if a.fairness_score is not None]

    avg_cand = round(sum(cand_scores) / len(cand_scores), 1) if cand_scores else None
    avg_iv   = round(sum(iv_scores)   / len(iv_scores),   1) if iv_scores   else None
    avg_fair = round(sum(fair_scores) / len(fair_scores), 1) if fair_scores else None

    # Hire distribution
    hire_dist = {'Hire': 0, 'Maybe': 0, 'No Hire': 0, 'Inconclusive': 0}
    for a in assessments:
        rec = a.hire_recommendation or ''
        if 'Hire' == rec:
            hire_dist['Hire'] += 1
        elif 'Maybe' == rec:
            hire_dist['Maybe'] += 1
        elif 'No Hire' == rec:
            hire_dist['No Hire'] += 1
        else:
            hire_dist['Inconclusive'] += 1

    hire_rate_pct = (
        round((hire_dist['Hire'] / total) * 100, 1) if total else None
    )

    # Question stats
    tech_qs    = [q for q in questions if q.is_technical]
    offrole_qs = [q for q in tech_qs   if not q.is_relevant]

    total_tech   = len(tech_qs)
    total_off    = len(offrole_qs)
    off_role_pct = round((total_off / total_tech) * 100, 1) if total_tech else None

    avg_qs_per   = round(total_tech / total, 1) if total else None

    # Candidate level distribution
    level_dist = {'Junior': 0, 'Mid': 0, 'Senior': 0}
    for a in assessments:
        lvl = a.candidate_level or ''
        if lvl in level_dist:
            level_dist[lvl] += 1

    # Domain distribution (from tech questions)
    domain_dist = {}
    for q in tech_qs:
        d = q.domain or 'Unknown'
        domain_dist[d] = domain_dist.get(d, 0) + 1

    return {
        'total_assessments':      total,
        'avg_candidate_score':    avg_cand,
        'avg_interviewer_score':  avg_iv,
        'avg_fairness_score':     avg_fair,
        'hire_distribution':      hire_dist,
        'hire_rate_pct':          hire_rate_pct,
        'total_tech_questions':   total_tech,
        'off_role_questions':     total_off,
        'off_role_pct':           off_role_pct,
        'avg_questions_per_interview': avg_qs_per,
        'level_distribution':     level_dist,
        'domain_distribution':    domain_dist,
    }