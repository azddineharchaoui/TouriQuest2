"""Model imports for property service"""

from app.models.property_models import (
    Property,
    PropertyType,
    PropertyStatus,
    BookingType,
    CancellationPolicy,
    Amenity,
    AmenityCategory,
    PropertyAmenity,
    PropertyImage,
    PropertyAvailability,
    PropertyPricingRule,
    PropertyReview,
)

from app.models.search_models import (
    SearchSession,
    SearchQuery,
    SearchResult,
    SearchClick,
    SavedSearch,
    SavedSearchAlert,
    TrendingLocation,
    SearchSuggestion,
)

from app.models.analytics_models import (
    SearchPerformanceMetric,
    ABTestExperiment,
    ABTestResult,
    RankingFeature,
    PropertyPopularityScore,
    SearchFeedback,
    ConversionFunnel,
)

__all__ = [
    # Property models
    "Property",
    "PropertyType",
    "PropertyStatus", 
    "BookingType",
    "CancellationPolicy",
    "Amenity",
    "AmenityCategory",
    "PropertyAmenity",
    "PropertyImage",
    "PropertyAvailability",
    "PropertyPricingRule",
    "PropertyReview",
    
    # Search models
    "SearchSession",
    "SearchQuery",
    "SearchResult",
    "SearchClick",
    "SavedSearch",
    "SavedSearchAlert",
    "TrendingLocation",
    "SearchSuggestion",
    
    # Analytics models
    "SearchPerformanceMetric",
    "ABTestExperiment",
    "ABTestResult",
    "RankingFeature",
    "PropertyPopularityScore",
    "SearchFeedback",
    "ConversionFunnel",
]