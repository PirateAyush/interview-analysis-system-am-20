from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Personal Details
    firstname = db.Column(db.String(100), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)

    # Organization Link
    organization_id = db.Column(db.String(50), db.ForeignKey('organizations.organization_id'), nullable=False, index=True)

    # Contact Details
    email = db.Column(db.String(255), nullable=False, index=True)
    mobile = db.Column(db.String(15), unique=True, nullable=False, index=True)

    # User Type (hr, interviewer, admin)
    type = db.Column(db.String(20), nullable=False, default='hr')

    # Authentication
    password = db.Column(db.String(255), nullable=False)

    # Status (active, inactive, suspended)
    status = db.Column(db.String(20), default='active', nullable=False)

    # Audit Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f'<User {self.firstname} {self.lastname} ({self.mobile})>'

    def get_full_name(self):
        return f'{self.firstname} {self.lastname}'

    def to_dict(self):
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'fullname': self.get_full_name(),
            'organization_id': self.organization_id,
            'email': self.email,
            'mobile': self.mobile,
            'type': self.type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }