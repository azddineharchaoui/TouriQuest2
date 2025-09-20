"""
Test configuration and fixtures for TouriQuest tests
"""
import os
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import your app and database models here
# from src.main import app
# from src.database.base import Base
# from src.database.session import get_db


# Test database configuration
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/touriquest_test"
)

# Create test engine
test_engine = create_engine(
    TEST_DATABASE_URL,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Set up test database."""
    # Create all tables
    # Base.metadata.create_all(bind=test_engine)
    yield
    # Drop all tables after tests
    # Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def override_get_db(db_session):
    """Override the get_db dependency for testing."""
    def _override_get_db():
        yield db_session
    
    # app.dependency_overrides[get_db] = _override_get_db
    yield
    # app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     yield client
    pass


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+1234567890"
    }


@pytest.fixture
def sample_property_data():
    """Sample property data for testing."""
    return {
        "title": "Beautiful Test Property",
        "description": "A wonderful place for testing",
        "property_type": "apartment",
        "address": "123 Test Street",
        "city": "Test City",
        "country": "Test Country",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "price_per_night": 100.00,
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 1
    }


@pytest.fixture
def sample_poi_data():
    """Sample POI data for testing."""
    return {
        "name": "Test Museum",
        "description": "A fascinating test museum",
        "category": "museum",
        "address": "456 Museum Ave",
        "city": "Test City",
        "country": "Test Country",
        "latitude": 40.7589,
        "longitude": -73.9851,
        "opening_hours": "9:00-17:00",
        "entry_fee": 15.00
    }


@pytest.fixture
def sample_experience_data():
    """Sample experience data for testing."""
    return {
        "title": "Test Cooking Class",
        "description": "Learn to cook traditional test cuisine",
        "category": "culinary",
        "duration": 180,  # 3 hours
        "max_participants": 10,
        "price": 75.00,
        "address": "789 Cooking St",
        "city": "Test City",
        "requirements": "No experience needed"
    }


@pytest.fixture
def auth_headers(sample_user_data):
    """Get authentication headers for testing."""
    # This would typically involve creating a user and getting a JWT token
    return {"Authorization": "Bearer test-jwt-token"}


@pytest.fixture
def mock_redis():
    """Mock Redis for testing."""
    import fakeredis
    return fakeredis.FakeRedis()


@pytest.fixture
def mock_elasticsearch():
    """Mock Elasticsearch for testing."""
    from unittest.mock import Mock
    return Mock()


@pytest.fixture
def mock_s3_client():
    """Mock S3 client for testing."""
    from unittest.mock import Mock
    return Mock()


@pytest.fixture
def mock_stripe():
    """Mock Stripe for payment testing."""
    from unittest.mock import Mock
    return Mock()


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/1")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_test")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")


# Markers for different test types
pytest_plugins = ["pytest_asyncio"]

# Custom assertions
def assert_response_success(response):
    """Assert that a response was successful."""
    assert 200 <= response.status_code < 300, f"Response failed with status {response.status_code}: {response.text}"


def assert_response_error(response, expected_status=400):
    """Assert that a response returned an error."""
    assert response.status_code == expected_status, f"Expected status {expected_status}, got {response.status_code}"


def assert_json_contains(response_json, expected_keys):
    """Assert that response JSON contains expected keys."""
    for key in expected_keys:
        assert key in response_json, f"Expected key '{key}' not found in response"


def assert_valid_uuid(uuid_string):
    """Assert that a string is a valid UUID."""
    import uuid
    try:
        uuid.UUID(uuid_string)
    except ValueError:
        pytest.fail(f"'{uuid_string}' is not a valid UUID")


def assert_valid_email(email):
    """Assert that a string is a valid email."""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    assert re.match(email_pattern, email), f"'{email}' is not a valid email address"


def assert_datetime_format(datetime_string):
    """Assert that a string is in valid datetime format."""
    from datetime import datetime
    try:
        datetime.fromisoformat(datetime_string.replace('Z', '+00:00'))
    except ValueError:
        pytest.fail(f"'{datetime_string}' is not a valid datetime format")