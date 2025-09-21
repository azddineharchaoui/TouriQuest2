"""
Template management system with dynamic content generation and multi-language support.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import json
import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, Template
from babel import Locale
from babel.dates import format_datetime
from babel.numbers import format_currency

from app.models.schemas import (
    NotificationType, DeliveryChannel, NotificationTemplate,
    TemplateVariable, LanguageCode
)

logger = logging.getLogger(__name__)


class TemplateType(Enum):
    """Template types for different use cases."""
    STANDARD = "standard"
    PROMOTIONAL = "promotional"
    TRANSACTIONAL = "transactional"
    EMERGENCY = "emergency"
    PERSONALIZED = "personalized"


class ContentBlock(Enum):
    """Content blocks within templates."""
    HEADER = "header"
    BODY = "body"
    FOOTER = "footer"
    CALL_TO_ACTION = "call_to_action"
    SIGNATURE = "signature"
    DISCLAIMER = "disclaimer"


class TemplateManager:
    """Manages notification templates with versioning and localization."""
    
    def __init__(self, template_dir: str = "templates"):
        self.template_dir = Path(template_dir)
        self.template_cache = {}
        self.version_cache = {}
        self.default_language = LanguageCode.EN
        
        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self._register_custom_filters()
        
        # Template registry
        self.templates = {}
        self._initialize_default_templates()
    
    def _register_custom_filters(self):
        """Register custom Jinja2 filters."""
        
        @self.jinja_env.filter('format_datetime')
        def format_datetime_filter(value: datetime, format: str = 'medium', locale: str = 'en'):
            """Format datetime with locale support."""
            try:
                return format_datetime(value, format, locale=Locale(locale))
            except Exception:
                return value.strftime('%Y-%m-%d %H:%M:%S')
        
        @self.jinja_env.filter('format_currency')
        def format_currency_filter(value: float, currency: str = 'USD', locale: str = 'en'):
            """Format currency with locale support."""
            try:
                return format_currency(value, currency, locale=Locale(locale))
            except Exception:
                return f"{currency} {value:.2f}"
        
        @self.jinja_env.filter('truncate_smart')
        def truncate_smart_filter(value: str, length: int = 100, suffix: str = '...'):
            """Smart truncation that respects word boundaries."""
            if len(value) <= length:
                return value
            
            truncated = value[:length].rsplit(' ', 1)[0]
            return f"{truncated}{suffix}"
        
        @self.jinja_env.filter('title_case')
        def title_case_filter(value: str):
            """Convert to title case."""
            return ' '.join(word.capitalize() for word in value.split())
    
    def _initialize_default_templates(self):
        """Initialize default notification templates."""
        
        # Booking confirmation templates
        self.templates["booking_confirmation"] = {
            LanguageCode.EN: {
                "subject": "Booking Confirmed: {{ booking.title }}",
                "body": """
Dear {{ user.name }},

Your booking has been confirmed! Here are the details:

**{{ booking.title }}**
Date: {{ booking.date | format_datetime }}
Location: {{ booking.location }}
{% if booking.price %}
Total: {{ booking.price | format_currency(booking.currency) }}
{% endif %}

{{ booking.description | truncate_smart(200) }}

{% if booking.confirmation_code %}
Confirmation Code: **{{ booking.confirmation_code }}**
{% endif %}

We can't wait to welcome you! If you have any questions, please don't hesitate to contact us.

Best regards,
The TouriQuest Team
                """,
                "action_text": "View Booking Details",
                "action_url": "{{ app_url }}/bookings/{{ booking.id }}"
            },
            LanguageCode.FR: {
                "subject": "Réservation confirmée : {{ booking.title }}",
                "body": """
Cher/Chère {{ user.name }},

Votre réservation a été confirmée ! Voici les détails :

**{{ booking.title }}**
Date : {{ booking.date | format_datetime('medium', 'fr') }}
Lieu : {{ booking.location }}
{% if booking.price %}
Total : {{ booking.price | format_currency(booking.currency, 'fr') }}
{% endif %}

{{ booking.description | truncate_smart(200) }}

{% if booking.confirmation_code %}
Code de confirmation : **{{ booking.confirmation_code }}**
{% endif %}

Nous avons hâte de vous accueillir ! Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe TouriQuest
                """,
                "action_text": "Voir les détails de la réservation",
                "action_url": "{{ app_url }}/bookings/{{ booking.id }}"
            }
        }
        
        # Price drop alert templates
        self.templates["price_drop_alert"] = {
            LanguageCode.EN: {
                "subject": "🔥 Price Drop Alert: Save {{ discount.percentage }}% on {{ item.title }}",
                "body": """
Great news, {{ user.name }}!

The price for **{{ item.title }}** just dropped by {{ discount.percentage }}%!

~~{{ item.original_price | format_currency(item.currency) }}~~ 
**{{ item.current_price | format_currency(item.currency) }}**

You save: {{ discount.amount | format_currency(item.currency) }}

{{ item.description | truncate_smart(150) }}

This deal won't last long - book now to secure this amazing price!
                """,
                "action_text": "Book Now",
                "action_url": "{{ app_url }}/experiences/{{ item.id }}"
            }
        }
        
        # Travel reminder templates
        self.templates["travel_reminder"] = {
            LanguageCode.EN: {
                "subject": "Travel Reminder: {{ trip.title }} is {{ days_until }} days away",
                "body": """
Hi {{ user.name }},

Just a friendly reminder about your upcoming trip:

**{{ trip.title }}**
Departure: {{ trip.departure_date | format_datetime }}
{% if trip.departure_location %}
From: {{ trip.departure_location }}
{% endif %}
{% if trip.destination %}
To: {{ trip.destination }}
{% endif %}

{% if days_until <= 3 %}
🚨 **Important:** Your trip is only {{ days_until }} days away!

Don't forget to:
- Check your travel documents
- Pack your essentials
- Confirm your transportation
{% if weather %}
- Check the weather: {{ weather.description }} ({{ weather.temperature }}°C)
{% endif %}
{% endif %}

Have an amazing trip!
                """,
                "action_text": "View Trip Details",
                "action_url": "{{ app_url }}/trips/{{ trip.id }}"
            }
        }
        
        # Safety alert templates
        self.templates["safety_alert"] = {
            LanguageCode.EN: {
                "subject": "🚨 Safety Alert: {{ alert.title }}",
                "body": """
**SAFETY ALERT**

{{ alert.message }}

{% if alert.severity == 'high' %}
⚠️ **IMMEDIATE ACTION REQUIRED** ⚠️
{% endif %}

{% if alert.location %}
Affected Area: {{ alert.location }}
{% endif %}

{% if alert.instructions %}
**What to do:**
{{ alert.instructions }}
{% endif %}

{% if alert.emergency_contacts %}
**Emergency Contacts:**
{% for contact in alert.emergency_contacts %}
- {{ contact.name }}: {{ contact.phone }}
{% endfor %}
{% endif %}

Stay safe!
TouriQuest Safety Team
                """,
                "action_text": "Get More Information",
                "action_url": "{{ app_url }}/safety/alerts/{{ alert.id }}"
            }
        }
        
        # Personalized recommendation templates
        self.templates["personalized_recommendation"] = {
            LanguageCode.EN: {
                "subject": "Perfect for you: {{ recommendation.title }}",
                "body": """
Hi {{ user.name }},

Based on your interests in {{ user.interests | join(', ') }}, we found something perfect for you:

**{{ recommendation.title }}**
⭐ {{ recommendation.rating }}/5 ({{ recommendation.review_count }} reviews)
📍 {{ recommendation.location }}
💰 Starting from {{ recommendation.price | format_currency(recommendation.currency) }}

{{ recommendation.description | truncate_smart(200) }}

{% if recommendation.match_reasons %}
**Why we think you'll love it:**
{% for reason in recommendation.match_reasons %}
- {{ reason }}
{% endfor %}
{% endif %}

{% if recommendation.limited_availability %}
⏰ **Limited availability** - Only {{ recommendation.spots_left }} spots left!
{% endif %}
                """,
                "action_text": "Explore This Experience",
                "action_url": "{{ app_url }}/experiences/{{ recommendation.id }}"
            }
        }
    
    async def get_template(
        self,
        template_name: str,
        language: LanguageCode = None,
        version: str = "latest"
    ) -> Optional[Dict[str, str]]:
        """Get template by name, language, and version."""
        
        if language is None:
            language = self.default_language
        
        # Check cache first
        cache_key = f"{template_name}_{language.value}_{version}"
        if cache_key in self.template_cache:
            return self.template_cache[cache_key]
        
        # Get from registry
        if template_name in self.templates:
            template_data = self.templates[template_name]
            
            # Try requested language first, fall back to English
            if language in template_data:
                template = template_data[language]
            elif LanguageCode.EN in template_data:
                template = template_data[LanguageCode.EN]
                logger.warning(f"Template {template_name} not available in {language.value}, using English")
            else:
                logger.error(f"Template {template_name} not found in any language")
                return None
            
            # Cache the result
            self.template_cache[cache_key] = template
            return template
        
        logger.error(f"Template {template_name} not found")
        return None
    
    async def render_template(
        self,
        template_name: str,
        variables: Dict[str, Any],
        language: LanguageCode = None,
        channel: DeliveryChannel = DeliveryChannel.EMAIL
    ) -> Dict[str, str]:
        """Render template with variables."""
        
        template_data = await self.get_template(template_name, language)
        if not template_data:
            raise ValueError(f"Template {template_name} not found")
        
        rendered = {}
        
        # Add common variables
        context = {
            **variables,
            "app_url": "https://touriquest.com",  # Should come from config
            "current_year": datetime.utcnow().year,
            "support_email": "support@touriquest.com",
            "unsubscribe_url": f"https://touriquest.com/unsubscribe?token={{{{ user.unsubscribe_token }}}}",
        }
        
        # Render each template field
        for field, template_content in template_data.items():
            try:
                template = self.jinja_env.from_string(template_content)
                rendered[field] = template.render(**context)
            except Exception as e:
                logger.error(f"Error rendering template field {field}: {e}")
                rendered[field] = template_content  # Return unrendered as fallback
        
        # Apply channel-specific modifications
        rendered = await self._apply_channel_modifications(rendered, channel)
        
        return rendered
    
    async def _apply_channel_modifications(
        self,
        rendered: Dict[str, str],
        channel: DeliveryChannel
    ) -> Dict[str, str]:
        """Apply channel-specific modifications to rendered content."""
        
        if channel == DeliveryChannel.SMS:
            # SMS: Truncate and remove formatting
            if "body" in rendered:
                # Remove HTML/Markdown formatting
                body = re.sub(r'\*\*(.*?)\*\*', r'\1', rendered["body"])  # Bold
                body = re.sub(r'~~(.*?)~~', r'\1', body)  # Strikethrough
                body = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', body)  # Links
                body = re.sub(r'#{1,6}\s*', '', body)  # Headers
                
                # Truncate to SMS limits
                rendered["body"] = body[:160]
            
            # SMS doesn't use subjects
            if "subject" in rendered:
                del rendered["subject"]
        
        elif channel == DeliveryChannel.PUSH:
            # Push: Short title and body
            if "subject" in rendered:
                rendered["title"] = rendered["subject"][:50]  # Push title limit
                del rendered["subject"]
            
            if "body" in rendered:
                # Remove formatting and truncate
                body = re.sub(r'\*\*(.*?)\*\*', r'\1', rendered["body"])
                body = re.sub(r'~~(.*?)~~', r'\1', body)
                body = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', body)
                rendered["body"] = body[:100]  # Push body limit
        
        elif channel == DeliveryChannel.EMAIL:
            # Email: Convert markdown to HTML
            if "body" in rendered:
                body = rendered["body"]
                
                # Convert markdown formatting to HTML
                body = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', body)
                body = re.sub(r'~~(.*?)~~', r'<del>\1</del>', body)
                body = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', body)
                body = re.sub(r'^#{1}\s*(.*?)$', r'<h1>\1</h1>', body, flags=re.MULTILINE)
                body = re.sub(r'^#{2}\s*(.*?)$', r'<h2>\1</h2>', body, flags=re.MULTILINE)
                body = re.sub(r'^#{3}\s*(.*?)$', r'<h3>\1</h3>', body, flags=re.MULTILINE)
                
                # Convert newlines to <br> or <p>
                body = re.sub(r'\n\n', '</p><p>', body)
                body = re.sub(r'\n', '<br>', body)
                body = f'<p>{body}</p>'
                
                rendered["body"] = body
        
        return rendered
    
    async def create_template(
        self,
        template_name: str,
        template_data: Dict[str, Dict[str, str]],
        template_type: TemplateType = TemplateType.STANDARD,
        description: str = None
    ) -> bool:
        """Create a new template."""
        
        try:
            # Validate template data
            for language, content in template_data.items():
                if not isinstance(content, dict):
                    raise ValueError(f"Invalid template content for language {language}")
                
                required_fields = ["subject", "body"]
                for field in required_fields:
                    if field not in content:
                        logger.warning(f"Template {template_name} missing {field} for {language}")
            
            # Store template
            self.templates[template_name] = template_data
            
            # Clear cache for this template
            cache_keys_to_remove = [k for k in self.template_cache.keys() if k.startswith(template_name)]
            for key in cache_keys_to_remove:
                del self.template_cache[key]
            
            logger.info(f"Created template {template_name} with {len(template_data)} languages")
            return True
            
        except Exception as e:
            logger.error(f"Error creating template {template_name}: {e}")
            return False
    
    async def update_template(
        self,
        template_name: str,
        language: LanguageCode,
        updates: Dict[str, str]
    ) -> bool:
        """Update specific fields of a template."""
        
        try:
            if template_name not in self.templates:
                logger.error(f"Template {template_name} not found")
                return False
            
            if language not in self.templates[template_name]:
                self.templates[template_name][language] = {}
            
            # Update fields
            self.templates[template_name][language].update(updates)
            
            # Clear cache
            cache_keys_to_remove = [k for k in self.template_cache.keys() 
                                  if k.startswith(f"{template_name}_{language.value}")]
            for key in cache_keys_to_remove:
                del self.template_cache[key]
            
            logger.info(f"Updated template {template_name} for {language.value}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating template {template_name}: {e}")
            return False
    
    async def validate_template(
        self,
        template_content: str,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Validate template syntax and variables."""
        
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "required_variables": [],
            "optional_variables": []
        }
        
        try:
            # Parse template
            template = self.jinja_env.from_string(template_content)
            
            # Extract variables
            ast = self.jinja_env.parse(template_content)
            
            # Get undefined variables
            undefined_vars = template.new_context().meta.find_undeclared_variables(ast)
            validation_result["required_variables"] = list(undefined_vars)
            
            # Test render with sample data if variables provided
            if variables:
                try:
                    template.render(**variables)
                except Exception as e:
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"Render error: {str(e)}")
            
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Template syntax error: {str(e)}")
        
        return validation_result
    
    async def get_template_variables(self, template_name: str) -> List[TemplateVariable]:
        """Get list of variables used in a template."""
        
        template_data = await self.get_template(template_name)
        if not template_data:
            return []
        
        variables = set()
        
        # Extract variables from all template fields
        for field_content in template_data.values():
            try:
                ast = self.jinja_env.parse(field_content)
                field_vars = self.jinja_env.new_context().meta.find_undeclared_variables(ast)
                variables.update(field_vars)
            except Exception as e:
                logger.warning(f"Error parsing template field for variables: {e}")
        
        # Convert to TemplateVariable objects with metadata
        variable_list = []
        for var_name in variables:
            # Infer type from variable name patterns
            var_type = "string"  # default
            
            if "date" in var_name.lower() or "time" in var_name.lower():
                var_type = "datetime"
            elif "price" in var_name.lower() or "amount" in var_name.lower():
                var_type = "number"
            elif "count" in var_name.lower() or "number" in var_name.lower():
                var_type = "integer"
            elif var_name.endswith("_url") or var_name.endswith("_link"):
                var_type = "url"
            elif var_name.endswith("s") and "." not in var_name:  # Likely array
                var_type = "array"
            
            variable_list.append(TemplateVariable(
                name=var_name,
                type=var_type,
                required=True,  # All template variables are required
                description=f"Variable used in template: {var_name}"
            ))
        
        return sorted(variable_list, key=lambda v: v.name)


# Global template manager instance
template_manager = TemplateManager()