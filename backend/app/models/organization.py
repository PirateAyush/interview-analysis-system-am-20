from app import db
from datetime import datetime
import uuid

class Organization(db.Model):
    __tablename__ = 'organizations'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Organization ID (Hexadecimal UUID)
    organization_id = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # Organization Details
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    industry = db.Column(db.String(100), nullable=True)

    # Status (active, inactive, suspended)
    status = db.Column(db.String(20), default='active', nullable=False)

    # Audit Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    users = db.relationship('User', foreign_keys='User.organization_id', backref='organization', lazy=True)

    def __repr__(self):
        return f'<Organization {self.name} ({self.organization_id})>'

    @staticmethod
    def generate_organization_id():
        """Generate a hexadecimal organization ID in format ORG-XXXXXXXXXXXX"""
        hex_uuid = uuid.uuid4().hex[:12].upper()
        return f'ORG-{hex_uuid}'

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'industry': self.industry,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }