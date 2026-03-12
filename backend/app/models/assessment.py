from app import db
from datetime import datetime


class Assessment(db.Model):
    __tablename__ = 'assessments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Who ran this assessment
    created_by    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    organization_id = db.Column(db.String(50), db.ForeignKey('organizations.organization_id'), nullable=False, index=True)

    # Interview metadata
    candidate_name    = db.Column(db.String(255), nullable=False)
    interviewer_name  = db.Column(db.String(255), nullable=False)
    applied_role      = db.Column(db.String(255), nullable=False)
    candidate_level   = db.Column(db.String(20),  nullable=False)   # Junior | Mid | Senior

    # Scores (0–100)
    candidate_score   = db.Column(db.Float, nullable=True)
    interviewer_score = db.Column(db.Float, nullable=True)
    fairness_score    = db.Column(db.Float, nullable=True)

    # Outcome
    hire_recommendation = db.Column(db.String(50),   nullable=True)  # Hire | Maybe | No Hire | Inconclusive
    summary             = db.Column(db.Text,          nullable=True)

    # Processing state
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending | completed | failed
    error  = db.Column(db.Text, nullable=True)

    # Audit
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    questions = db.relationship('AssessmentQuestion', backref='assessment', lazy=True,
                                cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Assessment {self.candidate_name} – {self.hire_recommendation}>'

    def to_dict(self, include_questions=False):
        data = {
            'id':                   self.id,
            'candidate_name':       self.candidate_name,
            'interviewer_name':     self.interviewer_name,
            'applied_role':         self.applied_role,
            'candidate_level':      self.candidate_level,
            'candidate_score':      self.candidate_score,
            'interviewer_score':    self.interviewer_score,
            'fairness_score':       self.fairness_score,
            'hire_recommendation':  self.hire_recommendation,
            'summary':              self.summary,
            'status':               self.status,
            'created_by':           self.created_by,
            'organization_id':      self.organization_id,
            'created_at':           self.created_at.isoformat() if self.created_at else None,
        }
        if include_questions:
            data['question_analyses'] = [q.to_dict() for q in self.questions]
        return data


class AssessmentQuestion(db.Model):
    __tablename__ = 'assessment_questions'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False, index=True)

    # Q&A content
    question = db.Column(db.Text, nullable=False)
    answer   = db.Column(db.Text, nullable=False)

    # Classification
    domain          = db.Column(db.String(100), nullable=True)
    seniority_level = db.Column(db.String(20),  nullable=True)
    is_relevant     = db.Column(db.Boolean,     default=True)
    is_technical    = db.Column(db.Boolean,     default=True)

    # Evaluation
    answer_score = db.Column(db.Float,       nullable=True)   # 0–10
    answer_level = db.Column(db.String(20),  nullable=True)   # Junior | Mid | Senior
    feedback     = db.Column(db.Text,        nullable=True)

    def __repr__(self):
        return f'<Question {self.id} score={self.answer_score}>'

    def to_dict(self):
        return {
            'id':               self.id,
            'assessment_id':    self.assessment_id,
            'question':         self.question,
            'answer':           self.answer,
            'domain':           self.domain,
            'seniority_level':  self.seniority_level,
            'is_relevant':      self.is_relevant,
            'is_technical':     self.is_technical,
            'answer_score':     self.answer_score,
            'answer_level':     self.answer_level,
            'feedback':         self.feedback,
        }