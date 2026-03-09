from app import create_app, db
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
