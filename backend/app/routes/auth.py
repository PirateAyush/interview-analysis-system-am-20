from flask import Blueprint, request, jsonify
from app import db, bcrypt
from app.models import Organization, User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
import random
import string
from app.utils.email_service import send_otp_email as email_otp, send_welcome_email

auth_bp = Blueprint('auth', __name__)

# In-memory OTP storage (for development - use Redis in production)
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(user, otp):
    """
    Send OTP via real SMTP email using the email service.
    Falls back to console print if SMTP is not configured.
    """
    org = Organization.query.filter_by(organization_id=user.organization_id).first()
    org_name = org.name if org else 'Your Organization'

    result = email_otp(
        to_email  = user.email,
        firstname = user.firstname,
        otp       = otp,
        mobile    = user.mobile,
        org_name  = org_name,
    )
    return result['success']


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    User signup with organization ID

    Request Body:
    {
        "organizationId": "ORG-XXXXXXXXXXXX",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "9876543210",
        "role": "hr",
        "password": "secure123"
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['organizationId', 'name', 'email', 'phone', 'role', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Validate organization ID format
        org_id = data['organizationId'].strip()
        if not org_id.startswith('ORG-') or len(org_id) != 16:
            return jsonify({'error': 'Invalid Organization ID format'}), 400

        # Check if organization exists
        org = Organization.query.filter_by(organization_id=org_id).first()
        if not org:
            return jsonify({'error': 'Organization not found'}), 404

        if org.status != 'active':
            return jsonify({'error': 'Organization is not active'}), 400

        # Validate phone number
        phone = data['phone'].strip()
        if len(phone) != 10 or not phone.isdigit():
            return jsonify({'error': 'Phone number must be 10 digits'}), 400

        # Check if mobile already exists
        existing_user = User.query.filter_by(mobile=phone).first()
        if existing_user:
            return jsonify({'error': 'Mobile number already registered'}), 400

        # Check if email already exists in this organization
        existing_email = User.query.filter_by(
            email=data['email'], 
            organization_id=org_id
        ).first()
        if existing_email:
            return jsonify({'error': 'Email already registered in this organization'}), 400

        # Validate password length
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Split name
        name_parts = data['name'].strip().split(' ', 1)
        firstname = name_parts[0]
        lastname = name_parts[1] if len(name_parts) > 1 else ''

        # Hash password
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        # Create user
        new_user = User(
            firstname=firstname,
            lastname=lastname,
            organization_id=org_id,
            email=data['email'],
            mobile=phone,
            type=data['role'],
            password=password_hash,
            status='active',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.session.add(new_user)
        db.session.commit()

        # Send welcome email
        send_welcome_email(
            to_email  = new_user.email,
            firstname = new_user.firstname,
            lastname  = new_user.lastname,
            mobile    = new_user.mobile,
            role      = new_user.type,
            org_name  = org.name,
            org_id    = org_id,
        )

        # Create JWT token
        access_token = create_access_token(identity=str(new_user.id))

        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Step 1: Login with mobile and password
    Returns session token for OTP verification

    Request Body:
    {
        "mobile": "9876543210",
        "password": "secure123"
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('mobile') or not data.get('password'):
            return jsonify({'error': 'Mobile and password are required'}), 400

        mobile = data['mobile'].strip()

        # Validate phone format
        if len(mobile) != 10 or not mobile.isdigit():
            return jsonify({'error': 'Invalid mobile number format'}), 400

        # Find user
        user = User.query.filter_by(mobile=mobile).first()

        if not user:
            return jsonify({'error': 'Invalid mobile number or password'}), 401

        # Check password
        if not bcrypt.check_password_hash(user.password, data['password']):
            return jsonify({'error': 'Invalid mobile number or password'}), 401

        # Check user status
        if user.status != 'active':
            return jsonify({'error': 'User account is not active'}), 403

        # Check organization status
        org = Organization.query.filter_by(organization_id=user.organization_id).first()
        if not org or org.status != 'active':
            return jsonify({'error': 'Organization is not active'}), 403

        # Generate OTP
        otp = generate_otp()

        # Store OTP (in production, use Redis with expiry)
        otp_storage[mobile] = {
            'otp': otp,
            'user_id': user.id,
            'attempts': 0
        }

        # Send OTP via email
        send_otp_email(user, otp)

        return jsonify({
            'success': True,
            'message': 'OTP sent to your registered email',
            'mobile': mobile,
            'email_hint': user.email[:3] + '***@' + user.email.split('@')[1]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Step 2: Verify OTP and complete login

    Request Body:
    {
        "mobile": "9876543210",
        "otp": "123456"
    }
    """
    try:
        data = request.get_json()

        if not data.get('mobile') or not data.get('otp'):
            return jsonify({'error': 'Mobile and OTP are required'}), 400

        mobile = data['mobile'].strip()
        otp = data['otp'].strip()

        # Check if OTP exists for this mobile
        if mobile not in otp_storage:
            return jsonify({'error': 'OTP expired or not found. Please login again.'}), 400

        stored_data = otp_storage[mobile]

        # Check attempts
        if stored_data['attempts'] >= 3:
            del otp_storage[mobile]
            return jsonify({'error': 'Too many failed attempts. Please login again.'}), 400

        # Verify OTP
        if stored_data['otp'] != otp:
            stored_data['attempts'] += 1
            return jsonify({
                'error': 'Invalid OTP',
                'attempts_left': 3 - stored_data['attempts']
            }), 401

        # OTP is valid - get user
        user = User.query.get(stored_data['user_id'])

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Clear OTP
        del otp_storage[mobile]

        # Create JWT token
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """
    Resend OTP to user's email

    Request Body:
    {
        "mobile": "9876543210"
    }
    """
    try:
        data = request.get_json()

        if not data.get('mobile'):
            return jsonify({'error': 'Mobile number is required'}), 400

        mobile = data['mobile'].strip()

        # Check if previous OTP exists
        if mobile not in otp_storage:
            return jsonify({'error': 'No active session. Please login again.'}), 400

        user = User.query.get(otp_storage[mobile]['user_id'])

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Generate new OTP
        otp = generate_otp()

        # Update OTP storage
        otp_storage[mobile] = {
            'otp': otp,
            'user_id': user.id,
            'attempts': 0
        }

        # Send OTP
        send_otp_email(user, otp)

        return jsonify({
            'success': True,
            'message': 'OTP resent successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current logged-in user details
    Requires JWT token in Authorization header
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500