"""Add user profile system with social features and travel statistics

Revision ID: 002_user_profile_system  
Revises: 001_initial_schema
Create Date: 2024-12-19 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic
revision = '002_user_profile_system'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add comprehensive user profile system with social features and travel statistics."""
    
    # Create enum types for profile system
    op.execute("""
        CREATE TYPE privacy_level AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
        CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
        CREATE TYPE achievement_type AS ENUM ('WORLD_EXPLORER', 'ECO_WARRIOR', 'CULTURE_SEEKER', 'ADVENTURE_MASTER', 'SOCIAL_BUTTERFLY');
        CREATE TYPE content_type AS ENUM ('PHOTO', 'VIDEO', 'REVIEW', 'BLOG_POST', 'RECOMMENDATION');
        CREATE TYPE activity_type AS ENUM ('PROFILE_UPDATE', 'PHOTO_UPLOAD', 'REVIEW_POST', 'FRIEND_ADDED', 'TRIP_CHECKIN', 'ACHIEVEMENT_EARNED');
    """)
    
    # User profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('bio', sa.Text),
        sa.Column('cover_photo_url', sa.String(500)),
        sa.Column('website_url', sa.String(500)),
        sa.Column('social_media_links', postgresql.JSONB),
        sa.Column('travel_motto', sa.String(255)),
        sa.Column('favorite_destinations', postgresql.ARRAY(sa.String(100))),
        sa.Column('languages_spoken', postgresql.ARRAY(sa.String(50))),
        sa.Column('travel_style', sa.String(50)),
        sa.Column('budget_preference', sa.String(50)),
        sa.Column('accommodation_preference', sa.String(50)),
        sa.Column('transportation_preference', sa.String(50)),
        sa.Column('activity_preferences', postgresql.ARRAY(sa.String(50))),
        sa.Column('dietary_restrictions', postgresql.ARRAY(sa.String(50))),
        sa.Column('accessibility_needs', postgresql.ARRAY(sa.String(50))),
        sa.Column('identity_verified', sa.Boolean, default=False),
        sa.Column('phone_verified', sa.Boolean, default=False),
        sa.Column('email_verified', sa.Boolean, default=False),
        sa.Column('social_media_verified', postgresql.JSONB),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        
        # Indexes
        sa.Index('idx_user_profiles_user_id', 'user_id'),
        sa.Index('idx_user_profiles_travel_style', 'travel_style'),
        sa.Index('idx_user_profiles_budget_preference', 'budget_preference'),
    )
    
    # Travel statistics table
    op.create_table(
        'travel_statistics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('countries_visited', sa.Integer, default=0),
        sa.Column('cities_visited', sa.Integer, default=0),
        sa.Column('continents_visited', sa.Integer, default=0),
        sa.Column('trips_taken', sa.Integer, default=0),
        sa.Column('total_miles_traveled', sa.Float, default=0.0),
        sa.Column('total_kilometers_traveled', sa.Float, default=0.0),
        sa.Column('total_days_traveled', sa.Integer, default=0),
        sa.Column('countries_visited_list', postgresql.ARRAY(sa.String(100))),
        sa.Column('cities_visited_list', postgresql.ARRAY(sa.String(100))),
        sa.Column('favorite_activities', postgresql.ARRAY(sa.String(100))),
        sa.Column('eco_score', sa.Integer, default=0),
        sa.Column('carbon_footprint', sa.Float, default=0.0),
        sa.Column('sustainable_choices', sa.Integer, default=0),
        sa.Column('local_experiences', sa.Integer, default=0),
        sa.Column('cultural_sites_visited', sa.Integer, default=0),
        sa.Column('adventure_activities', sa.Integer, default=0),
        sa.Column('photos_shared', sa.Integer, default=0),
        sa.Column('reviews_written', sa.Integer, default=0),
        sa.Column('places_recommended', sa.Integer, default=0),
        sa.Column('followers_count', sa.Integer, default=0),
        sa.Column('following_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        
        # Indexes
        sa.Index('idx_travel_statistics_user_id', 'user_id'),
        sa.Index('idx_travel_statistics_countries_visited', 'countries_visited'),
        sa.Index('idx_travel_statistics_eco_score', 'eco_score'),
    )
    
    # Social connections table
    op.create_table(
        'social_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('follower_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('following_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('connection_type', sa.String(50), default='follow'),
        sa.Column('is_mutual', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        
        # Constraints
        sa.UniqueConstraint('follower_id', 'following_id', name='unique_social_connection'),
        sa.CheckConstraint('follower_id != following_id', name='no_self_follow'),
        
        # Indexes
        sa.Index('idx_social_connections_follower', 'follower_id'),
        sa.Index('idx_social_connections_following', 'following_id'),
        sa.Index('idx_social_connections_mutual', 'is_mutual'),
    )
    
    # User achievements table
    op.create_table(
        'user_achievements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('achievement_type', sa.Enum('WORLD_EXPLORER', 'ECO_WARRIOR', 'CULTURE_SEEKER', 'ADVENTURE_MASTER', 'SOCIAL_BUTTERFLY', name='achievement_type'), nullable=False),
        sa.Column('level', sa.Integer, default=1),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('icon_url', sa.String(500)),
        sa.Column('badge_url', sa.String(500)),
        sa.Column('points_awarded', sa.Integer, default=0),
        sa.Column('criteria_met', postgresql.JSONB),
        sa.Column('unlock_date', sa.DateTime, default=sa.func.now()),
        sa.Column('is_visible', sa.Boolean, default=True),
        sa.Column('is_featured', sa.Boolean, default=False),
        
        # Constraints
        sa.UniqueConstraint('user_id', 'achievement_type', 'level', name='unique_user_achievement_level'),
        
        # Indexes
        sa.Index('idx_user_achievements_user_id', 'user_id'),
        sa.Index('idx_user_achievements_type', 'achievement_type'),
        sa.Index('idx_user_achievements_unlock_date', 'unlock_date'),
        sa.Index('idx_user_achievements_visible', 'is_visible'),
    )
    
    # User content table
    op.create_table(
        'user_content',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content_type', sa.Enum('PHOTO', 'VIDEO', 'REVIEW', 'BLOG_POST', 'RECOMMENDATION', name='content_type'), nullable=False),
        sa.Column('title', sa.String(255)),
        sa.Column('description', sa.Text),
        sa.Column('content_url', sa.String(500)),
        sa.Column('thumbnail_url', sa.String(500)),
        sa.Column('location_name', sa.String(200)),
        sa.Column('location_coordinates', postgresql.JSONB),
        sa.Column('tags', postgresql.ARRAY(sa.String(50))),
        sa.Column('privacy_level', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='PUBLIC'),
        sa.Column('rating', sa.Integer),
        sa.Column('likes_count', sa.Integer, default=0),
        sa.Column('comments_count', sa.Integer, default=0),
        sa.Column('shares_count', sa.Integer, default=0),
        sa.Column('view_count', sa.Integer, default=0),
        sa.Column('metadata', postgresql.JSONB),
        sa.Column('is_featured', sa.Boolean, default=False),
        sa.Column('is_archived', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        
        # Constraints
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='valid_rating'),
        
        # Indexes
        sa.Index('idx_user_content_user_id', 'user_id'),
        sa.Index('idx_user_content_type', 'content_type'),
        sa.Index('idx_user_content_privacy', 'privacy_level'),
        sa.Index('idx_user_content_location', 'location_name'),
        sa.Index('idx_user_content_created_at', 'created_at'),
        sa.Index('idx_user_content_featured', 'is_featured'),
        sa.Index('idx_user_content_tags', 'tags', postgresql_using='gin'),
    )
    
    # User activity table
    op.create_table(
        'user_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('activity_type', sa.Enum('PROFILE_UPDATE', 'PHOTO_UPLOAD', 'REVIEW_POST', 'FRIEND_ADDED', 'TRIP_CHECKIN', 'ACHIEVEMENT_EARNED', name='activity_type'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('metadata', postgresql.JSONB),
        sa.Column('privacy_level', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('location_name', sa.String(200)),
        sa.Column('related_content_id', postgresql.UUID(as_uuid=True)),
        sa.Column('related_user_id', postgresql.UUID(as_uuid=True)),
        sa.Column('engagement_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        
        # Indexes
        sa.Index('idx_user_activities_user_id', 'user_id'),
        sa.Index('idx_user_activities_type', 'activity_type'),
        sa.Index('idx_user_activities_privacy', 'privacy_level'),
        sa.Index('idx_user_activities_created_at', 'created_at'),
        sa.Index('idx_user_activities_related_user', 'related_user_id'),
    )
    
    # Travel timeline table
    op.create_table(
        'travel_timelines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trip_title', sa.String(255)),
        sa.Column('destination', sa.String(200), nullable=False),
        sa.Column('country', sa.String(100)),
        sa.Column('city', sa.String(100)),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date),
        sa.Column('duration_days', sa.Integer),
        sa.Column('trip_type', sa.String(50)),
        sa.Column('accommodation_type', sa.String(50)),
        sa.Column('transportation_used', postgresql.ARRAY(sa.String(50))),
        sa.Column('activities_done', postgresql.ARRAY(sa.String(100))),
        sa.Column('places_visited', postgresql.ARRAY(sa.String(200))),
        sa.Column('travel_companions', sa.Integer, default=1),
        sa.Column('budget_spent', sa.Numeric(10, 2)),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('notes', sa.Text),
        sa.Column('photos', postgresql.ARRAY(sa.String(500))),
        sa.Column('rating', sa.Integer),
        sa.Column('would_return', sa.Boolean),
        sa.Column('privacy_level', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('is_current_trip', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        
        # Constraints
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='valid_timeline_rating'),
        sa.CheckConstraint('end_date IS NULL OR end_date >= start_date', name='valid_timeline_dates'),
        
        # Indexes
        sa.Index('idx_travel_timelines_user_id', 'user_id'),
        sa.Index('idx_travel_timelines_destination', 'destination'),
        sa.Index('idx_travel_timelines_country', 'country'),
        sa.Index('idx_travel_timelines_start_date', 'start_date'),
        sa.Index('idx_travel_timelines_privacy', 'privacy_level'),
        sa.Index('idx_travel_timelines_current', 'is_current_trip'),
    )
    
    # User privacy settings table
    op.create_table(
        'user_privacy_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('profile_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='PUBLIC'),
        sa.Column('contact_info_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('statistics_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='PUBLIC'),
        sa.Column('achievements_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='PUBLIC'),
        sa.Column('connections_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('timeline_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('activity_visibility', sa.Enum('PUBLIC', 'FOLLOWERS', 'PRIVATE', name='privacy_level'), default='FOLLOWERS'),
        sa.Column('location_sharing', sa.Boolean, default=True),
        sa.Column('show_online_status', sa.Boolean, default=True),
        sa.Column('allow_friend_requests', sa.Boolean, default=True),
        sa.Column('allow_messages', sa.Boolean, default=True),
        sa.Column('email_notifications', sa.Boolean, default=True),
        sa.Column('push_notifications', sa.Boolean, default=True),
        sa.Column('marketing_emails', sa.Boolean, default=False),
        sa.Column('data_analytics', sa.Boolean, default=True),
        sa.Column('content_personalization', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        
        # Indexes
        sa.Index('idx_user_privacy_settings_user_id', 'user_id'),
        sa.Index('idx_user_privacy_settings_profile_visibility', 'profile_visibility'),
    )
    
    # Add new columns to existing users table for profile integration
    op.add_column('users', sa.Column('location', sa.String(200)))
    op.add_column('users', sa.Column('bio_short', sa.String(160)))
    op.add_column('users', sa.Column('is_email_verified', sa.Boolean, default=False))
    op.add_column('users', sa.Column('verification_status', sa.Enum('PENDING', 'VERIFIED', 'REJECTED', name='verification_status'), default='PENDING'))
    op.add_column('users', sa.Column('social_media_handle', sa.String(100)))
    op.add_column('users', sa.Column('referral_code', sa.String(20), unique=True))
    op.add_column('users', sa.Column('referred_by', postgresql.UUID(as_uuid=True)))
    
    # Create indexes for new user columns
    op.create_index('idx_users_location', 'users', ['location'])
    op.create_index('idx_users_verification_status', 'users', ['verification_status'])
    op.create_index('idx_users_referral_code', 'users', ['referral_code'])
    op.create_index('idx_users_referred_by', 'users', ['referred_by'])
    
    # Add foreign key constraint for referral system
    op.create_foreign_key(
        'fk_users_referred_by',
        'users', 'users',
        ['referred_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove user profile system tables and columns."""
    
    # Drop new user table columns
    op.drop_constraint('fk_users_referred_by', 'users', type_='foreignkey')
    op.drop_index('idx_users_referred_by', 'users')
    op.drop_index('idx_users_referral_code', 'users')
    op.drop_index('idx_users_verification_status', 'users')
    op.drop_index('idx_users_location', 'users')
    
    op.drop_column('users', 'referred_by')
    op.drop_column('users', 'referral_code')
    op.drop_column('users', 'social_media_handle')
    op.drop_column('users', 'verification_status')
    op.drop_column('users', 'is_email_verified')
    op.drop_column('users', 'bio_short')
    op.drop_column('users', 'location')
    
    # Drop profile system tables
    op.drop_table('user_privacy_settings')
    op.drop_table('travel_timelines')
    op.drop_table('user_activities')
    op.drop_table('user_content')
    op.drop_table('user_achievements')
    op.drop_table('social_connections')
    op.drop_table('travel_statistics')
    op.drop_table('user_profiles')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS activity_type')
    op.execute('DROP TYPE IF EXISTS content_type')
    op.execute('DROP TYPE IF EXISTS achievement_type')
    op.execute('DROP TYPE IF EXISTS verification_status')
    op.execute('DROP TYPE IF EXISTS privacy_level')