"""
Analytics API Endpoints Module

This module contains all the analytics API endpoints for the TouriQuest Analytics Service.
"""

# Import all endpoint modules to make them available for router inclusion
from . import dashboard
from . import revenue
from . import users
from . import properties
from . import trends
from . import pois
from . import experiences
from . import traffic
from . import conversion
from . import retention
from . import engagement
from . import performance
from . import reports
from . import realtime
from . import forecasting

__all__ = [
    'dashboard',
    'revenue', 
    'users',
    'properties',
    'trends',
    'pois',
    'experiences',
    'traffic',
    'conversion',
    'retention',
    'engagement',
    'performance',
    'reports',
    'realtime',
    'forecasting'
]