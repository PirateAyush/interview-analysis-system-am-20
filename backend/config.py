import os
from datetime import timedelta

class Config:
    # Secret key for JWT
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///interview_analysis.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_HEADERS = 'Content-Type'

    # Email / SMTP Configuration
    SMTP_HOST         = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT         = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER         = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD     = os.environ.get('SMTP_PASSWORD', '')
    EMAIL_FROM_NAME   = os.environ.get('EMAIL_FROM_NAME', 'InterviewAI')
    EMAIL_FROM_ADDRESS= os.environ.get('EMAIL_FROM_ADDRESS', '')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}