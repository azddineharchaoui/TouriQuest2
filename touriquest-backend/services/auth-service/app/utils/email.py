"""
Email Utilities
Email sending functions for authentication flows
"""
import os
from typing import Dict, Any, Optional
from datetime import datetime
import logging

# These would typically use a proper email service like SendGrid, AWS SES, etc.
# For now, we'll create a mock implementation

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending authentication-related emails"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@touriquest.com")
        self.from_name = os.getenv("FROM_NAME", "TouriQuest")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using configured SMTP or email service"""
        
        try:
            # TODO: Implement actual email sending
            # This would typically use aiosmtplib, sendgrid, AWS SES, etc.
            
            logger.info(f"Sending email to {to_email}: {subject}")
            logger.debug(f"Email content: {html_content}")
            
            # For now, just log the email (in production, replace with actual sending)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()


async def send_verification_email(email: str, verification_token: str) -> bool:
    """Send email verification email"""
    
    # In production, this would be a proper frontend URL
    verification_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token={verification_token}"
    
    subject = "Verify your TouriQuest account"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .button {{ 
                display: inline-block; 
                background-color: #2c5aa0; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
            }}
            .footer {{ padding: 20px; font-size: 12px; color: #666; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to TouriQuest!</h1>
            </div>
            <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>Thank you for signing up for TouriQuest! To complete your registration and start exploring amazing travel experiences, please verify your email address.</p>
                
                <p>Click the button below to verify your email:</p>
                
                <a href="{verification_url}" class="button">Verify Email Address</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{verification_url}</p>
                
                <p>This link will expire in 24 hours for security reasons.</p>
                
                <p>If you didn't create an account with TouriQuest, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 TouriQuest. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to TouriQuest!
    
    Thank you for signing up! To complete your registration, please verify your email address by clicking the link below:
    
    {verification_url}
    
    This link will expire in 24 hours.
    
    If you didn't create an account with TouriQuest, you can safely ignore this email.
    
    © 2024 TouriQuest. All rights reserved.
    """
    
    return await email_service.send_email(email, subject, html_content, text_content)


async def send_password_reset_email(email: str, reset_token: str) -> bool:
    """Send password reset email"""
    
    reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token={reset_token}"
    
    subject = "Reset your TouriQuest password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #dc3545; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .button {{ 
                display: inline-block; 
                background-color: #dc3545; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
            }}
            .footer {{ padding: 20px; font-size: 12px; color: #666; text-align: center; }}
            .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset the password for your TouriQuest account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <a href="{reset_url}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{reset_url}</p>
                
                <div class="warning">
                    <strong>Important Security Information:</strong>
                    <ul>
                        <li>This link will expire in 1 hour for security reasons</li>
                        <li>The link can only be used once</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Consider enabling two-factor authentication for better security</li>
                    </ul>
                </div>
                
                <p>If you're having trouble with the link above, contact our support team.</p>
            </div>
            <div class="footer">
                <p>© 2024 TouriQuest. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Password Reset Request
    
    We received a request to reset the password for your TouriQuest account.
    
    Click the link below to reset your password:
    {reset_url}
    
    Important:
    - This link will expire in 1 hour
    - The link can only be used once
    - If you didn't request this reset, please ignore this email
    
    © 2024 TouriQuest. All rights reserved.
    """
    
    return await email_service.send_email(email, subject, html_content, text_content)


async def send_welcome_email(email: str, first_name: str) -> bool:
    """Send welcome email after successful onboarding"""
    
    subject = f"Welcome to TouriQuest, {first_name}!"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to TouriQuest</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .button {{ 
                display: inline-block; 
                background-color: #28a745; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
            }}
            .footer {{ padding: 20px; font-size: 12px; color: #666; text-align: center; }}
            .feature {{ margin: 15px 0; padding: 15px; background-color: white; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to TouriQuest, {first_name}!</h1>
            </div>
            <div class="content">
                <h2>Your journey begins now!</h2>
                <p>Congratulations on completing your TouriQuest registration! We're excited to help you discover incredible travel experiences.</p>
                
                <div class="feature">
                    <h3>🗺️ Discover Amazing Places</h3>
                    <p>Explore hidden gems and popular destinations with our AI-powered recommendations.</p>
                </div>
                
                <div class="feature">
                    <h3>🎯 Personalized Experiences</h3>
                    <p>Get recommendations tailored to your travel preferences and interests.</p>
                </div>
                
                <div class="feature">
                    <h3>📱 Smart Travel Tools</h3>
                    <p>Use our AR experiences, audio guides, and real-time information to enhance your trips.</p>
                </div>
                
                <p>Ready to start exploring?</p>
                
                <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard" class="button">Start Exploring</a>
                
                <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
                <p>© 2024 TouriQuest. All rights reserved.</p>
                <p>You're receiving this email because you signed up for TouriQuest.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to TouriQuest, {first_name}!
    
    Congratulations on completing your registration! We're excited to help you discover incredible travel experiences.
    
    What you can do with TouriQuest:
    - Discover amazing places with AI-powered recommendations
    - Get personalized experiences tailored to your preferences  
    - Use smart travel tools including AR and audio guides
    
    Ready to start exploring? Visit: {os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard
    
    © 2024 TouriQuest. All rights reserved.
    """
    
    return await email_service.send_email(email, subject, html_content, text_content)


async def send_security_alert_email(
    email: str, 
    event_type: str, 
    details: Dict[str, Any]
) -> bool:
    """Send security alert email for suspicious activities"""
    
    subject = f"TouriQuest Security Alert - {event_type}"
    
    # Format event details
    event_time = details.get('timestamp', datetime.utcnow()).strftime('%Y-%m-%d %H:%M:%S UTC')
    ip_address = details.get('ip_address', 'Unknown')
    location = details.get('location', 'Unknown')
    device = details.get('device', 'Unknown')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Security Alert</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #dc3545; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .alert {{ background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            .details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            .footer {{ padding: 20px; font-size: 12px; color: #666; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Security Alert</h1>
            </div>
            <div class="content">
                <div class="alert">
                    <h2>Suspicious Activity Detected</h2>
                    <p><strong>Event:</strong> {event_type}</p>
                </div>
                
                <p>We detected unusual activity on your TouriQuest account and wanted to notify you immediately.</p>
                
                <div class="details">
                    <h3>Event Details:</h3>
                    <p><strong>Time:</strong> {event_time}</p>
                    <p><strong>IP Address:</strong> {ip_address}</p>
                    <p><strong>Location:</strong> {location}</p>
                    <p><strong>Device:</strong> {device}</p>
                </div>
                
                <h3>What should you do?</h3>
                <ul>
                    <li>If this was you, no action is needed</li>
                    <li>If this wasn't you, change your password immediately</li>
                    <li>Review your account activity and active sessions</li>
                    <li>Enable two-factor authentication if not already enabled</li>
                    <li>Contact support if you need assistance</li>
                </ul>
                
                <p>Your account security is important to us. If you have any concerns, please contact our support team.</p>
            </div>
            <div class="footer">
                <p>© 2024 TouriQuest. All rights reserved.</p>
                <p>This is an automated security notification.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    TouriQuest Security Alert
    
    We detected unusual activity on your account:
    
    Event: {event_type}
    Time: {event_time}
    IP Address: {ip_address}
    Location: {location}
    Device: {device}
    
    If this wasn't you:
    - Change your password immediately
    - Review your account activity
    - Enable two-factor authentication
    - Contact support if needed
    
    © 2024 TouriQuest. All rights reserved.
    """
    
    return await email_service.send_email(email, subject, html_content, text_content)