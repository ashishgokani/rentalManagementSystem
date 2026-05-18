import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_otp_email(to_email: str, otp: str):
    """
    Send OTP via email using SMTP.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("[WARNING] SMTP credentials not set. Email not sent.")
        return False
        
    sender_email = settings.SMTP_USER.replace(" ", "") if settings.SMTP_USER else None
    password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else None
    smtp_server = settings.SMTP_HOST or "smtp.gmail.com"
    smtp_port = settings.SMTP_PORT or 587
    
    message = MIMEMultipart("alternative")
    message["Subject"] = "Password Reset OTP - Rental Management System"
    message["From"] = sender_email
    message["To"] = to_email
    
    # Create the plain-text and HTML version of your message
    text = f"""\
    Hi,
    
    Your OTP for password reset is: {otp}
    
    This OTP is valid for {settings.OTP_EXPIRE_MINUTES} minutes.
    
    If you did not request this, please ignore this email.
    """
    
    html = f"""\
    <html>
      <body>
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hi,</p>
            <p>You requested to reset your password. Use the following OTP to proceed:</p>
            <h1 style="color: #4F46E5; letter-spacing: 5px;">{otp}</h1>
            <p>This OTP is valid for <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.</p>
            <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
        </div>
      </body>
    </html>
    """
    
    # Turn these into plain/html MIMEText objects
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    
    # Add HTML/plain-text parts to MIMEMultipart message
    # The email client will try to render the last part first
    message.attach(part1)
    message.attach(part2)
    
    try:
        # Create secure connection with server and send email
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(sender_email, password)
                server.sendmail(sender_email, to_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, password)
                server.sendmail(sender_email, to_email, message.as_string())
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {str(e)}")
        return False


def send_email(to_email: str, subject: str, html_content: str):
    """
    Generic function to send HTML email.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[WARNING] SMTP credentials not set. Mocking email to {to_email} with subject: {subject}")
        return True
        
    sender_email = settings.SMTP_USER.replace(" ", "") if settings.SMTP_USER else None
    password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else None
    smtp_server = settings.SMTP_HOST or "smtp.gmail.com"
    smtp_port = settings.SMTP_PORT or 587
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = to_email
    
    part = MIMEText(html_content, "html")
    message.attach(part)
    
    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(sender_email, password)
                server.sendmail(sender_email, to_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, password)
                server.sendmail(sender_email, to_email, message.as_string())
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {str(e)}")
        return False
