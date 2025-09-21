"""
Test script to verify experience service structure
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

async def test_imports():
    """Test that all imports work correctly"""
    try:
        print("Testing core imports...")
        from app.core.config import settings
        print("✓ Config imported successfully")
        
        print("Testing database imports...")
        from app.db.database import Base, get_db, init_db
        print("✓ Database imports successful")
        
        print("Testing model imports...")
        from app.models import (
            Experience, Provider, ExperienceCategory, 
            SkillLevel, BookingStatus, UserInteraction
        )
        print("✓ Model imports successful")
        
        print("Testing schema imports...")
        from app.schemas import (
            ExperienceSearchResponse, SearchFilters, 
            RecommendationParams, LocationPoint
        )
        print("✓ Schema imports successful")
        
        print("Testing service imports...")
        from app.services.experience_service import ExperienceService
        from app.services.recommendation_service import RecommendationService
        from app.services.weather_service import WeatherService
        from app.services.provider_service import ProviderService
        print("✓ Service imports successful")
        
        print("Testing API imports...")
        from app.api import api_router
        from app.api.experiences import router as exp_router
        print("✓ API imports successful")
        
        print("Testing main app import...")
        from app.main import app
        print("✓ Main app imported successfully")
        
        print("\n🎉 All imports successful! Experience service structure is valid.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_configuration():
    """Test configuration loading"""
    try:
        from app.core.config import settings
        
        print(f"\nConfiguration Test:")
        print(f"✓ Service Name: {settings.SERVICE_NAME}")
        print(f"✓ Debug Mode: {settings.DEBUG}")
        print(f"✓ Database URL configured: {'Yes' if settings.DATABASE_URL else 'No'}")
        
        return True
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False


def test_enums():
    """Test enum definitions"""
    try:
        from app.models import ExperienceCategory, SkillLevel, WeatherDependency
        
        print(f"\nEnum Test:")
        print(f"✓ Experience Categories: {[cat.value for cat in ExperienceCategory]}")
        print(f"✓ Skill Levels: {[level.value for level in SkillLevel]}")
        print(f"✓ Weather Dependencies: {[dep.value for dep in WeatherDependency]}")
        
        return True
    except Exception as e:
        print(f"❌ Enum error: {e}")
        return False


async def main():
    """Run all tests"""
    print("🧪 Testing TouriQuest Experience Service Structure\n")
    print("=" * 60)
    
    # Test imports
    import_success = await test_imports()
    
    if import_success:
        # Test configuration
        config_success = test_configuration()
        
        # Test enums
        enum_success = test_enums()
        
        if config_success and enum_success:
            print("\n" + "=" * 60)
            print("🎉 All tests passed! Experience service is ready for development.")
            print("\nNext steps:")
            print("1. Install dependencies: pip install -r requirements.txt")
            print("2. Set up database: Configure DATABASE_URL in environment")
            print("3. Run service: python -m app.main")
            print("4. Test endpoints: http://localhost:8000/docs")
        else:
            print("\n❌ Some tests failed. Please check the configuration.")
    else:
        print("\n❌ Import tests failed. Please check the code structure.")


if __name__ == "__main__":
    asyncio.run(main())