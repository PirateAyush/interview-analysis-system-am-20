from flask import Blueprint, request, jsonify
from app import db, bcrypt
from app.models import Organization, User, Assessment
from flask_jwt_extended import jwt_required, get_jwt_identity
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

# ── GET /api/organization/members ─────────────────────────────────────────────
@org_bp.route('/members', methods=['GET'])
@jwt_required()
def list_members():
    """
    Returns all users in the current user's organization.

    Each member includes:
      - Full user details (id, name, email, mobile, type, status, created_at)
      - assessment_count: how many assessments they have submitted (created_by)

    Query params:
      role   – filter by type: admin | hr | interviewer
      status – filter by status: active | inactive | suspended
      search – search by name or email (case-insensitive)
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(int(current_user_id))

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        org_id = current_user.organization_id

        # ── Base query ────────────────────────────────────────────────────────
        query = User.query.filter_by(organization_id=org_id)

        # ── Optional filters ──────────────────────────────────────────────────
        role   = request.args.get('role')
        status = request.args.get('status')
        search = request.args.get('search', '').strip().lower()

        if role and role in ('admin', 'hr', 'interviewer'):
            query = query.filter_by(type=role)

        if status and status in ('active', 'inactive', 'suspended'):
            query = query.filter_by(status=status)

        # Sort: admins first, then hr, then interviewer; then alphabetical
        from sqlalchemy import case
        role_order = case(
            (User.type == 'admin',       1),
            (User.type == 'hr',          2),
            (User.type == 'interviewer', 3),
            else_=4
        )
        users = query.order_by(role_order, User.firstname, User.lastname).all()

        # ── Apply name/email search (post-query, simple) ───────────────────
        if search:
            users = [
                u for u in users
                if search in u.get_full_name().lower()
                or search in u.email.lower()
            ]

        # ── Assessment count per user (created_by) ────────────────────────
        from sqlalchemy import func
        counts_raw = (
            db.session.query(Assessment.created_by, func.count(Assessment.id))
            .filter(Assessment.organization_id == org_id)
            .group_by(Assessment.created_by)
            .all()
        )
        count_map = {user_id: cnt for user_id, cnt in counts_raw}

        # ── Build response ────────────────────────────────────────────────
        members = []
        for u in users:
            d = u.to_dict()
            d['assessment_count'] = count_map.get(u.id, 0)
            d['is_current_user']  = (u.id == int(current_user_id))
            members.append(d)

        # ── Summary stats (always over the whole org, not filtered) ───────
        all_users = User.query.filter_by(organization_id=org_id).all()
        summary = {
            'total':       len(all_users),
            'admin':       sum(1 for u in all_users if u.type == 'admin'),
            'hr':          sum(1 for u in all_users if u.type == 'hr'),
            'interviewer': sum(1 for u in all_users if u.type == 'interviewer'),
            'active':      sum(1 for u in all_users if u.status == 'active'),
            'inactive':    sum(1 for u in all_users if u.status != 'active'),
        }

        return jsonify({
            'members': members,
            'summary': summary,
            'filtered_count': len(members),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500