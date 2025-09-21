"""
Communication service integrations (SendGrid, Twilio, AWS SES, Slack, WhatsApp)
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import base64

import aiohttp
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.services.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class SendGridService(BaseIntegrationService):
    """SendGrid email service integration"""
    
    def __init__(self):
        super().__init__("sendgrid")
        self.api_key = settings.SENDGRID_API_KEY
        self.base_url = "https://api.sendgrid.com/v3"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute SendGrid API request"""
        url = f"{self.base_url}/{endpoint}"
        
        default_headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if headers:
            default_headers.update(headers)
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                json=data if method in ["POST", "PUT", "PATCH"] else None,
                params=data if method == "GET" else None,
                headers=default_headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                # SendGrid often returns 202 for successful requests
                if response.status not in [200, 201, 202, 204]:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {response.status} - {error_text}")
                
                if response.status == 204:
                    return {"status": "success"}
                
                try:
                    return await response.json()
                except:
                    return {"status": "success", "text": await response.text()}
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        content: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        html_content: Optional[str] = None,
        template_id: Optional[str] = None,
        template_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send email via SendGrid"""
        try:
            from_email = from_email or settings.SENDGRID_FROM_EMAIL
            from_name = from_name or settings.SENDGRID_FROM_NAME
            
            # Prepare email data
            email_data = {
                "personalizations": [
                    {
                        "to": [{"email": email} for email in to_emails],
                        "subject": subject
                    }
                ],
                "from": {
                    "email": from_email,
                    "name": from_name
                },
                "content": []
            }
            
            # Add template or content
            if template_id:
                email_data["template_id"] = template_id
                if template_data:
                    email_data["personalizations"][0]["dynamic_template_data"] = template_data
            else:
                # Add plain text content
                email_data["content"].append({
                    "type": "text/plain",
                    "value": content
                })
                
                # Add HTML content if provided
                if html_content:
                    email_data["content"].append({
                        "type": "text/html",
                        "value": html_content
                    })
            
            response_data = await self.make_api_request(
                endpoint="mail/send",
                method="POST",
                data=email_data
            )
            
            # Record cost
            await self.record_cost(
                cost_type="email_send",
                amount=0.001 * len(to_emails),  # $0.001 per email
                quantity=len(to_emails)
            )
            
            return {
                "status": "sent",
                "message_id": response_data.get("message_id"),
                "recipients": to_emails
            }
            
        except Exception as e:
            logger.error(f"SendGrid send email error: {e}")
            raise
    
    async def send_template_email(
        self,
        to_emails: List[str],
        template_id: str,
        template_data: Dict[str, Any],
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send templated email via SendGrid"""
        return await self.send_email(
            to_emails=to_emails,
            subject="",  # Subject is in template
            content="",  # Content is in template
            from_email=from_email,
            from_name=from_name,
            template_id=template_id,
            template_data=template_data
        )
    
    async def create_contact(
        self,
        email: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        custom_fields: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create or update contact in SendGrid"""
        try:
            contact_data = {
                "contacts": [
                    {
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        **(custom_fields or {})
                    }
                ]
            }
            
            response_data = await self.make_api_request(
                endpoint="marketing/contacts",
                method="PUT",
                data=contact_data
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"SendGrid create contact error: {e}")
            raise
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform SendGrid health check"""
        try:
            # Test by getting account information
            await self.make_api_request(endpoint="user/account", method="GET")
            return {"api_key_valid": True, "service": "available"}
        except Exception as e:
            return {"api_key_valid": False, "service": "unavailable", "error": str(e)}


class TwilioService(BaseIntegrationService):
    """Twilio SMS and voice service integration"""
    
    def __init__(self):
        super().__init__("twilio")
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute Twilio API request"""
        url = f"{self.base_url}/{endpoint}"
        
        # Twilio uses basic auth
        auth_string = f"{self.account_sid}:{self.auth_token}"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        default_headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        if headers:
            default_headers.update(headers)
        
        async with aiohttp.ClientSession() as session:
            # Convert data to form format for Twilio
            form_data = None
            if data and method in ["POST", "PUT", "PATCH"]:
                form_data = aiohttp.FormData()
                for key, value in data.items():
                    form_data.add_field(key, str(value))
            
            async with session.request(
                method,
                url,
                data=form_data,
                params=data if method == "GET" else None,
                headers=default_headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status not in [200, 201]:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        try:
            from_number = from_number or self.phone_number
            
            sms_data = {
                "From": from_number,
                "To": to_number,
                "Body": message
            }
            
            response_data = await self.make_api_request(
                endpoint="Messages.json",
                method="POST",
                data=sms_data
            )
            
            # Record cost
            await self.record_cost(
                cost_type="sms_send",
                amount=0.0075,  # $0.0075 per SMS
                quantity=1
            )
            
            return {
                "status": "sent",
                "sid": response_data.get("sid"),
                "to": to_number,
                "from": from_number,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Twilio SMS error: {e}")
            raise
    
    async def make_call(
        self,
        to_number: str,
        twiml_url: str,
        from_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """Make voice call via Twilio"""
        try:
            from_number = from_number or self.phone_number
            
            call_data = {
                "From": from_number,
                "To": to_number,
                "Url": twiml_url
            }
            
            response_data = await self.make_api_request(
                endpoint="Calls.json",
                method="POST",
                data=call_data
            )
            
            # Record cost
            await self.record_cost(
                cost_type="voice_call",
                amount=0.013,  # $0.013 per minute (base cost)
                quantity=1
            )
            
            return {
                "status": "initiated",
                "sid": response_data.get("sid"),
                "to": to_number,
                "from": from_number
            }
            
        except Exception as e:
            logger.error(f"Twilio call error: {e}")
            raise
    
    async def send_whatsapp(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send WhatsApp message via Twilio"""
        try:
            from_number = from_number or f"whatsapp:{self.phone_number}"
            if not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"
            
            whatsapp_data = {
                "From": from_number,
                "To": to_number,
                "Body": message
            }
            
            response_data = await self.make_api_request(
                endpoint="Messages.json",
                method="POST",
                data=whatsapp_data
            )
            
            # Record cost
            await self.record_cost(
                cost_type="whatsapp_send",
                amount=0.005,  # $0.005 per WhatsApp message
                quantity=1
            )
            
            return {
                "status": "sent",
                "sid": response_data.get("sid"),
                "to": to_number,
                "from": from_number,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Twilio WhatsApp error: {e}")
            raise
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform Twilio health check"""
        try:
            # Test by getting account information
            response_data = await self.make_api_request(endpoint=".json", method="GET")
            return {
                "account_valid": True,
                "service": "available",
                "account_sid": response_data.get("sid")
            }
        except Exception as e:
            return {"account_valid": False, "service": "unavailable", "error": str(e)}


class AWSSESService(BaseIntegrationService):
    """AWS Simple Email Service integration"""
    
    def __init__(self):
        super().__init__("aws_ses")
        self.ses_client = None
        self.region = settings.AWS_REGION
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
    
    async def initialize(self):
        """Initialize AWS SES client"""
        await super().initialize()
        
        self.ses_client = boto3.client(
            'ses',
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key
        )
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute AWS SES request (using boto3)"""
        # This is handled by boto3 directly, not through HTTP requests
        return data or {}
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send email via AWS SES"""
        try:
            from_email = from_email or settings.AWS_SES_FROM_EMAIL
            
            # Prepare email
            email_data = {
                'Source': from_email,
                'Destination': {
                    'ToAddresses': to_emails
                },
                'Message': {
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': body_text,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            }
            
            if body_html:
                email_data['Message']['Body']['Html'] = {
                    'Data': body_html,
                    'Charset': 'UTF-8'
                }
            
            if reply_to:
                email_data['ReplyToAddresses'] = reply_to
            
            # Send email using boto3
            response = self.ses_client.send_email(**email_data)
            
            # Record cost
            await self.record_cost(
                cost_type="email_send",
                amount=0.0001 * len(to_emails),  # $0.0001 per email
                quantity=len(to_emails)
            )
            
            return {
                "status": "sent",
                "message_id": response.get("MessageId"),
                "recipients": to_emails
            }
            
        except ClientError as e:
            logger.error(f"AWS SES error: {e}")
            raise Exception(f"SES error: {e.response['Error']['Message']}")
        except Exception as e:
            logger.error(f"AWS SES send email error: {e}")
            raise
    
    async def send_template_email(
        self,
        to_emails: List[str],
        template_name: str,
        template_data: Dict[str, Any],
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send templated email via AWS SES"""
        try:
            from_email = from_email or settings.AWS_SES_FROM_EMAIL
            
            email_data = {
                'Source': from_email,
                'Destinations': [
                    {
                        'Destination': {
                            'ToAddresses': [email]
                        },
                        'ReplacementTemplateData': json.dumps(template_data)
                    }
                    for email in to_emails
                ],
                'Template': template_name,
                'DefaultTemplateData': json.dumps(template_data)
            }
            
            response = self.ses_client.send_bulk_templated_email(**email_data)
            
            # Record cost
            await self.record_cost(
                cost_type="template_email_send",
                amount=0.0001 * len(to_emails),  # $0.0001 per email
                quantity=len(to_emails)
            )
            
            return {
                "status": "sent",
                "message_ids": [dest.get("MessageId") for dest in response.get("Destinations", [])],
                "recipients": to_emails
            }
            
        except ClientError as e:
            logger.error(f"AWS SES template error: {e}")
            raise Exception(f"SES template error: {e.response['Error']['Message']}")
        except Exception as e:
            logger.error(f"AWS SES send template email error: {e}")
            raise
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform AWS SES health check"""
        try:
            # Test by getting send quota
            response = self.ses_client.get_send_quota()
            return {
                "service": "available",
                "send_quota": response.get("Max24HourSend"),
                "sent_last_24h": response.get("SentLast24Hours")
            }
        except Exception as e:
            return {"service": "unavailable", "error": str(e)}


class SlackService(BaseIntegrationService):
    """Slack integration service"""
    
    def __init__(self):
        super().__init__("slack")
        self.bot_token = settings.SLACK_BOT_TOKEN
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        self.base_url = "https://slack.com/api"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute Slack API request"""
        url = f"{self.base_url}/{endpoint}"
        
        default_headers = {
            "Authorization": f"Bearer {self.bot_token}",
            "Content-Type": "application/json"
        }
        
        if headers:
            default_headers.update(headers)
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                json=data if method in ["POST", "PUT", "PATCH"] else None,
                params=data if method == "GET" else None,
                headers=default_headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                if not response_data.get("ok"):
                    raise Exception(f"Slack API error: {response_data.get('error')}")
                
                return response_data
    
    async def send_message(
        self,
        channel: str,
        text: str,
        blocks: Optional[List[Dict[str, Any]]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Send message to Slack channel"""
        try:
            message_data = {
                "channel": channel,
                "text": text
            }
            
            if blocks:
                message_data["blocks"] = blocks
            
            if attachments:
                message_data["attachments"] = attachments
            
            response_data = await self.make_api_request(
                endpoint="chat.postMessage",
                method="POST",
                data=message_data
            )
            
            return {
                "status": "sent",
                "ts": response_data.get("ts"),
                "channel": response_data.get("channel")
            }
            
        except Exception as e:
            logger.error(f"Slack send message error: {e}")
            raise
    
    async def send_webhook_message(self, text: str, blocks: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Send message via Slack webhook"""
        try:
            if not self.webhook_url:
                raise Exception("Slack webhook URL not configured")
            
            message_data = {"text": text}
            if blocks:
                message_data["blocks"] = blocks
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.webhook_url,
                    json=message_data,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        return {"status": "sent"}
                    else:
                        error_text = await response.text()
                        raise Exception(f"Webhook failed: {error_text}")
            
        except Exception as e:
            logger.error(f"Slack webhook error: {e}")
            raise
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform Slack health check"""
        try:
            response_data = await self.make_api_request(endpoint="auth.test", method="GET")
            return {
                "service": "available",
                "bot_id": response_data.get("bot_id"),
                "team": response_data.get("team")
            }
        except Exception as e:
            return {"service": "unavailable", "error": str(e)}


class CommunicationService:
    """Unified communication service"""
    
    def __init__(self):
        self.sendgrid = SendGridService()
        self.twilio = TwilioService()
        self.aws_ses = AWSSESService()
        self.slack = SlackService()
        self.preferred_email_provider = "sendgrid"
        self.preferred_sms_provider = "twilio"
    
    async def initialize(self):
        """Initialize all communication services"""
        await self.sendgrid.initialize()
        await self.twilio.initialize()
        await self.aws_ses.initialize()
        await self.slack.initialize()
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        content: str,
        html_content: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email using preferred or specified provider"""
        provider = provider or self.preferred_email_provider
        
        try:
            if provider == "sendgrid":
                return await self.sendgrid.send_email(
                    to_emails=to_emails,
                    subject=subject,
                    content=content,
                    html_content=html_content
                )
            elif provider == "aws_ses":
                return await self.aws_ses.send_email(
                    to_emails=to_emails,
                    subject=subject,
                    body_text=content,
                    body_html=html_content
                )
            else:
                raise ValueError(f"Unknown email provider: {provider}")
                
        except Exception as e:
            # Fallback to other provider
            logger.warning(f"Primary email provider {provider} failed, trying fallback")
            
            if provider == "sendgrid":
                return await self.aws_ses.send_email(
                    to_emails=to_emails,
                    subject=subject,
                    body_text=content,
                    body_html=html_content
                )
            else:
                return await self.sendgrid.send_email(
                    to_emails=to_emails,
                    subject=subject,
                    content=content,
                    html_content=html_content
                )
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send SMS using specified provider"""
        provider = provider or self.preferred_sms_provider
        
        if provider == "twilio":
            return await self.twilio.send_sms(to_number, message)
        else:
            raise ValueError(f"Unknown SMS provider: {provider}")
    
    async def send_notification(
        self,
        channel: str,
        message: str,
        notification_type: str = "slack"
    ) -> Dict[str, Any]:
        """Send notification via specified channel"""
        if notification_type == "slack":
            return await self.slack.send_message(channel, message)
        else:
            raise ValueError(f"Unknown notification type: {notification_type}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all communication services"""
        sendgrid_health = await self.sendgrid.health_check()
        twilio_health = await self.twilio.health_check()
        aws_ses_health = await self.aws_ses.health_check()
        slack_health = await self.slack.health_check()
        
        return {
            "sendgrid": sendgrid_health,
            "twilio": twilio_health,
            "aws_ses": aws_ses_health,
            "slack": slack_health,
            "overall_status": "healthy" if any([
                sendgrid_health.get("status") == "healthy",
                twilio_health.get("status") == "healthy",
                aws_ses_health.get("status") == "healthy",
                slack_health.get("status") == "healthy"
            ]) else "unhealthy"
        }