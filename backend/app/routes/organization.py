from flask import Blueprint, request, jsonify
from app import db, bcrypt
from app.models import Organization, User
from datetime import datetime

org_bp = Blueprint('organization', __name__)

@org_bp.route('/create', methods=['POST'])
def create_organization():
    """
    Create a new organization with admin user

    Request Body:
    {
        "adminName": "John Doe",
        "adminEmail": "john@example.com",
        "adminPhone": "9876543210",
        "orgName": "Tech Corp",
        "orgDescription": "A tech company",
        "orgLocation": "Mumbai, India",
        "orgIndustry": "Technology",
        "password": "secure123"
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['adminName', 'adminEmail', 'adminPhone', 'orgName', 
                          'orgDescription', 'orgLocation', 'orgIndustry', 'password']

        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Validate phone number format
        if len(data['adminPhone']) != 10 or not data['adminPhone'].isdigit():
            return jsonify({'error': 'Phone number must be 10 digits'}), 400

        # Validate email format
        if '@' not in data['adminEmail']:
            return jsonify({'error': 'Invalid email format'}), 400

        # Check if mobile already exists
        existing_user = User.query.filter_by(mobile=data['adminPhone']).first()
        if existing_user:
            return jsonify({'error': 'Mobile number already registered'}), 400

        # Generate unique organization ID
        organization_id = Organization.generate_organization_id()

        # Create organization
        new_org = Organization(
            organization_id=organization_id,
            name=data['orgName'],
            description=data['orgDescription'],
            location=data['orgLocation'],
            industry=data['orgIndustry'],
            status='active',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.session.add(new_org)
        db.session.flush()  # Get the org ID without committing

        # Split admin name
        name_parts = data['adminName'].strip().split(' ', 1)
        firstname = name_parts[0]
        lastname = name_parts[1] if len(name_parts) > 1 else ''

        # Hash password
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        # Create admin user
        admin_user = User(
            firstname=firstname,
            lastname=lastname,
            organization_id=organization_id,
            email=data['adminEmail'],
            mobile=data['adminPhone'],
            type='admin',
            password=password_hash,
            status='active',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.session.add(admin_user)
        db.session.flush()

        # Update organization created_by
        new_org.created_by = admin_user.id
        new_org.updated_by = admin_user.id

        # Commit transaction
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Organization created successfully',
            'organization_id': organization_id,
            'organization': new_org.to_dict(),
            'admin_user': {
                'id': admin_user.id,
                'name': admin_user.get_full_name(),
                'email': admin_user.email,
                'mobile': admin_user.mobile
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@org_bp.route('/verify/<org_id>', methods=['GET'])
def verify_organization(org_id):
    """
    Verify if an organization ID exists
    """
    try:
        org = Organization.query.filter_by(organization_id=org_id).first()

        if not org:
            return jsonify({'valid': False, 'message': 'Organization not found'}), 404

        if org.status != 'active':
            return jsonify({'valid': False, 'message': 'Organization is not active'}), 400

        return jsonify({
            'valid': True,
            'organization': {
                'id': org.organization_id,
                'name': org.name,
                'location': org.location,
                'industry': org.industry
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@org_bp.route('/list', methods=['GET'])
def list_organizations():
    """
    List all active organizations (for testing/admin)
    """
    try:
        orgs = Organization.query.filter_by(status='active').all()
        return jsonify({
            'organizations': [org.to_dict() for org in orgs]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500