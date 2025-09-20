"""Initial database schema creation

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema with all tables and relationships."""
    
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('username', sa.String(50), unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('phone_number', sa.String(20)),
        sa.Column('date_of_birth', sa.Date),
        sa.Column('gender', sa.String(20)),
        sa.Column('nationality', sa.String(50)),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('is_premium', sa.Boolean, default=False),
        sa.Column('user_type', sa.String(20), default='traveler'),
        sa.Column('language_preference', sa.String(10), default='en'),
        sa.Column('currency_preference', sa.String(3), default='USD'),
        sa.Column('timezone', sa.String(50), default='UTC'),
        sa.Column('last_login', sa.DateTime),
        sa.Column('login_count', sa.Integer, default=0),
        sa.Column('failed_login_attempts', sa.Integer, default=0),
        sa.Column('account_locked_until', sa.DateTime),
        sa.Column('email_verified_at', sa.DateTime),
        sa.Column('phone_verified_at', sa.DateTime),
        sa.Column('terms_accepted_at', sa.DateTime),
        sa.Column('privacy_accepted_at', sa.DateTime),
        sa.Column('marketing_consent', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime),
        sa.Column('metadata', postgresql.JSONB),
    )
    
    # User Profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('bio', sa.Text),
        sa.Column('website_url', sa.String(500)),
        sa.Column('social_links', postgresql.JSONB),
        sa.Column('cover_image_url', sa.String(500)),
        sa.Column('travel_style', postgresql.ARRAY(sa.String)),
        sa.Column('interests', postgresql.ARRAY(sa.String)),
        sa.Column('languages_spoken', postgresql.ARRAY(sa.String)),
        sa.Column('countries_visited', postgresql.ARRAY(sa.String)),
        sa.Column('bucket_list_destinations', postgresql.ARRAY(sa.String)),
        sa.Column('travel_frequency', sa.String(20)),
        sa.Column('budget_range', sa.String(20)),
        sa.Column('accommodation_preference', postgresql.ARRAY(sa.String)),
        sa.Column('activity_preferences', postgresql.ARRAY(sa.String)),
        sa.Column('dietary_restrictions', postgresql.ARRAY(sa.String)),
        sa.Column('accessibility_needs', postgresql.ARRAY(sa.String)),
        sa.Column('emergency_contact_name', sa.String(200)),
        sa.Column('emergency_contact_phone', sa.String(20)),
        sa.Column('emergency_contact_email', sa.String(255)),
        sa.Column('privacy_settings', postgresql.JSONB),
        sa.Column('notification_preferences', postgresql.JSONB),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime),
        sa.Column('metadata', postgresql.JSONB),
    )
    
    # Properties table
    op.create_table(
        'properties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('property_type', sa.String(50), nullable=False),
        sa.Column('listing_type', sa.String(20), default='entire_place'),
        sa.Column('host_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('address', sa.String(500)),
        sa.Column('city', sa.String(100)),
        sa.Column('state_province', sa.String(100)),
        sa.Column('country', sa.String(100)),
        sa.Column('postal_code', sa.String(20)),
        sa.Column('latitude', sa.Numeric(10, 8)),
        sa.Column('longitude', sa.Numeric(11, 8)),
        sa.Column('max_guests', sa.Integer, nullable=False),
        sa.Column('bedrooms', sa.Integer),
        sa.Column('beds', sa.Integer),
        sa.Column('bathrooms', sa.Numeric(3, 1)),
        sa.Column('base_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('cleaning_fee', sa.Numeric(10, 2)),
        sa.Column('security_deposit', sa.Numeric(10, 2)),
        sa.Column('extra_guest_fee', sa.Numeric(10, 2)),
        sa.Column('weekend_pricing', sa.Numeric(10, 2)),
        sa.Column('minimum_nights', sa.Integer, default=1),
        sa.Column('maximum_nights', sa.Integer),
        sa.Column('check_in_time', sa.String(10)),
        sa.Column('check_out_time', sa.String(10)),
        sa.Column('cancellation_policy', sa.String(50)),
        sa.Column('house_rules', sa.Text),
        sa.Column('amenities', postgresql.ARRAY(sa.String)),
        sa.Column('safety_features', postgresql.ARRAY(sa.String)),
        sa.Column('space_features', postgresql.ARRAY(sa.String)),
        sa.Column('nearby_attractions', postgresql.ARRAY(sa.String)),
        sa.Column('transportation_info', sa.Text),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('is_instant_book', sa.Boolean, default=False),
        sa.Column('is_superhost', sa.Boolean, default=False),
        sa.Column('guest_favorite', sa.Boolean, default=False),
        sa.Column('response_rate', sa.Numeric(5, 2)),
        sa.Column('response_time', sa.String(20)),
        sa.Column('booking_count', sa.Integer, default=0),
        sa.Column('view_count', sa.Integer, default=0),
        sa.Column('favorite_count', sa.Integer, default=0),
        sa.Column('average_rating', sa.Numeric(3, 2)),
        sa.Column('review_count', sa.Integer, default=0),
        sa.Column('last_booked', sa.DateTime),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime),
        sa.Column('metadata', postgresql.JSONB),
    )
    
    # Continue with other essential tables...
    # POIs table
    op.create_table(
        'pois',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('poi_type', sa.String(50), nullable=False),
        sa.Column('category', sa.String(50)),
        sa.Column('subcategory', sa.String(50)),
        sa.Column('address', sa.String(500)),
        sa.Column('city', sa.String(100)),
        sa.Column('country', sa.String(100)),
        sa.Column('latitude', sa.Numeric(10, 8)),
        sa.Column('longitude', sa.Numeric(11, 8)),
        sa.Column('phone_number', sa.String(20)),
        sa.Column('website_url', sa.String(500)),
        sa.Column('email', sa.String(255)),
        sa.Column('price_range', sa.String(20)),
        sa.Column('rating_overall', sa.Numeric(3, 2)),
        sa.Column('rating_count', sa.Integer, default=0),
        sa.Column('popularity_score', sa.Numeric(5, 2), default=0),
        sa.Column('visit_duration_min', sa.Integer),
        sa.Column('best_time_to_visit', sa.String(100)),
        sa.Column('accessibility_features', postgresql.ARRAY(sa.String)),
        sa.Column('tags', postgresql.ARRAY(sa.String)),
        sa.Column('entry_fee', sa.Numeric(10, 2)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime),
        sa.Column('metadata', postgresql.JSONB),
    )


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.drop_table('pois')
    op.drop_table('properties')
    op.drop_table('user_profiles')
    op.drop_table('users')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS "pg_trgm"')
    op.execute('DROP EXTENSION IF EXISTS "postgis"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')