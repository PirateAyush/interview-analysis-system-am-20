import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path


# ── Template Engine Setup ──────────────────────────────────────────────────────
TEMPLATES_DIR = Path(__file__).parent.parent / 'email_templates'

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(['html']),
)


# ── Render Helpers ─────────────────────────────────────────────────────────────

def _render_base(subject: str, body_html: str) -> str:
    """
    Wraps any body content inside the base.html template (header + footer).
    """
    base_template = jinja_env.get_template('base.html')
    return base_template.render(
        subject=subject,
        body_content=body_html,
        year=datetime.utcnow().year,
    )


def _render_body(template_name: str, context: dict) -> str:
    """
    Renders a body-only template (e.g. otp_login.html) with given context.
    Returns raw HTML string — NOT a full page.
    """
    template = jinja_env.get_template(template_name)
    return template.render(**context)


# ── SMTP Sender ────────────────────────────────────────────────────────────────

def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Core SMTP sender. Sends a fully rendered HTML email.

    Args:
        to_email    : Recipient email address
        subject     : Email subject line
        html_content: Fully rendered HTML string (base + body already merged)

    Returns:
        { success: bool, message: str }
    """
    smtp_host   = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port   = int(os.environ.get('SMTP_PORT', 587))
    smtp_user   = os.environ.get('SMTP_USER', '')
    smtp_pass   = os.environ.get('SMTP_PASSWORD', '')
    from_name   = os.environ.get('EMAIL_FROM_NAME', 'InterviewAI')
    from_email  = os.environ.get('EMAIL_FROM_ADDRESS', smtp_user)

    if not smtp_user or not smtp_pass:
        # Dev fallback — print to console if SMTP not configured
        print(f"\n{'='*60}")
        print(f"📧  EMAIL (Dev Mode — SMTP not configured)")
        print(f"{'='*60}")
        print(f"  To      : {to_email}")
        print(f"  Subject : {subject}")
        print(f"  Content : [HTML email — configure SMTP to send real emails]")
        print(f"{'='*60}\n")
        return {'success': True, 'message': 'Dev mode: logged to console'}

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f"{from_name} <{from_email}>"
        msg['To']      = to_email
        msg['X-Mailer'] = 'InterviewAI Mailer'

        # Attach HTML body
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        # Connect and send
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())

        print(f"✅ Email sent to {to_email} | Subject: {subject}")
        return {'success': True, 'message': f'Email sent to {to_email}'}

    except smtplib.SMTPAuthenticationError:
        msg = 'SMTP authentication failed. Check your email and App Password.'
        print(f"❌ {msg}")
        return {'success': False, 'message': msg}

    except smtplib.SMTPException as e:
        msg = f'SMTP error: {str(e)}'
        print(f"❌ {msg}")
        return {'success': False, 'message': msg}

    except Exception as e:
        msg = f'Email sending failed: {str(e)}'
        print(f"❌ {msg}")
        return {'success': False, 'message': msg}


# ── Public Email Functions ─────────────────────────────────────────────────────

def send_otp_email(
    to_email: str,
    firstname: str,
    otp: str,
    mobile: str,
    org_name: str = 'Your Organization',
) -> dict:
    """
    Sends an OTP login email.

    Usage:
        from app.utils.email_service import send_otp_email
        send_otp_email('user@example.com', 'Ayush', '482910', '9876543210', 'Tech Corp')
    """
    subject = f'{otp} is your InterviewAI login code'

    # Render body content
    body_html = _render_body('otp_login.html', {
        'firstname'  : firstname,
        'otp'        : otp,
        'mobile'     : mobile,
        'org_name'   : org_name,
        'timestamp'  : datetime.utcnow().strftime('%d %b %Y, %I:%M %p UTC'),
    })

    # Wrap in base template
    full_html = _render_base(subject, body_html)

    return send_email(to_email, subject, full_html)


def send_welcome_email(
    to_email: str,
    firstname: str,
    lastname: str,
    mobile: str,
    role: str,
    org_name: str,
    org_id: str,
    dashboard_url: str = 'http://localhost:3000/dashboard',
) -> dict:
    """
    Sends a welcome email after signup.

    Usage:
        from app.utils.email_service import send_welcome_email
        send_welcome_email('user@example.com', 'Ayush', 'Sharma', '9876543210',
                           'hr', 'Tech Corp', 'ORG-ABCD1234EF56')
    """
    subject = f'Welcome to InterviewAI, {firstname}! 🎉'

    body_html = _render_body('welcome.html', {
        'firstname'     : firstname,
        'lastname'      : lastname,
        'email'         : to_email,
        'mobile'        : mobile,
        'role'          : role,
        'org_name'      : org_name,
        'org_id'        : org_id,
        'dashboard_url' : dashboard_url,
    })

    full_html = _render_base(subject, body_html)

    return send_email(to_email, subject, full_html)


# ── Generic / Custom Email ─────────────────────────────────────────────────────

def send_custom_email(
    to_email: str,
    subject: str,
    body_template: str,
    context: dict,
) -> dict:
    """
    Send any custom email using a named template file.

    Args:
        to_email      : Recipient
        subject       : Subject line
        body_template : Template filename e.g. 'password_reset.html'
        context       : Dict of variables to pass to the template

    Usage:
        send_custom_email(
            'user@example.com',
            'Your password was reset',
            'password_reset.html',
            { 'firstname': 'Ayush', 'reset_link': 'https://...' }
        )
    """
    body_html = _render_body(body_template, context)
    full_html = _render_base(subject, body_html)
    return send_email(to_email, subject, full_html)