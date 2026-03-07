from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # CORS Configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://localhost:3001"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # JWT Error Handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"❌ Invalid Token Error: {error}")
        return jsonify({'error': 'Invalid token', 'message': str(error)}), 401
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        print(f"❌ Unauthorized Error: {error}")
        return jsonify({'error': 'Missing authorization header', 'message': str(error)}), 401
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        print(f"❌ Expired Token: {jwt_data}")
        return jsonify({'error': 'Token has expired'}), 401
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.organization import org_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(org_bp, url_prefix='/api/organization')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    @app.route('/')
    def index():
        return {
            'message': 'Interview Analysis System API',
            'status': 'running',
            'version': '1.0'
        }
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200
    
    return app
