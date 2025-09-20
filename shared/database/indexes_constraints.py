"""
Database Indexes and Constraints

This module contains SQL scripts for creating performance indexes, 
constraints, and database optimizations for the TouriQuest application.
"""

# Performance Indexes for Core Tables
PERFORMANCE_INDEXES = {
    "users": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_email_active ON users(email) WHERE is_active = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_username_active ON users(username) WHERE is_active = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_phone_verified ON users(phone_number) WHERE phone_verified_at IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_premium ON users(is_premium) WHERE is_premium = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_last_login ON users(last_login);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_created_at ON users(created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_user_type ON users(user_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_nationality ON users(nationality);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_language ON users(language_preference);",
    ],
    
    "user_profiles": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_travel_style ON user_profiles USING GIN(travel_style);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_interests ON user_profiles USING GIN(interests);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_countries_visited ON user_profiles USING GIN(countries_visited);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_languages ON user_profiles USING GIN(languages_spoken);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_budget ON user_profiles(budget_range);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_profiles_frequency ON user_profiles(travel_frequency);",
    ],
    
    "properties": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_location ON properties(country, city, state_province);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_coordinates ON properties(latitude, longitude);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_type_status ON properties(property_type, status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_host_status ON properties(host_id, status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_price_range ON properties(base_price, currency);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_guests ON properties(max_guests);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_rating ON properties(average_rating) WHERE average_rating IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_instant_book ON properties(is_instant_book) WHERE is_instant_book = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_superhost ON properties(is_superhost) WHERE is_superhost = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_amenities ON properties USING GIN(amenities);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_created_at ON properties(created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_last_booked ON properties(last_booked);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_view_count ON properties(view_count);",
    ],
    
    "pois": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_location ON pois(country, city);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_coordinates ON pois(latitude, longitude);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_type_category ON pois(poi_type, category);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_rating ON pois(rating_overall) WHERE rating_overall IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_popularity ON pois(popularity_score);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_price_range ON pois(price_range);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_active_verified ON pois(is_active, is_verified);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_tags ON pois USING GIN(tags);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_accessibility ON pois USING GIN(accessibility_features);",
    ],
    
    "experiences": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_location ON experiences(country, city);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_coordinates ON experiences(latitude, longitude);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_category ON experiences(category);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_provider ON experiences(provider_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_price ON experiences(base_price, currency);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_duration ON experiences(duration_hours);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_group_size ON experiences(max_participants);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_rating ON experiences(average_rating) WHERE average_rating IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_difficulty ON experiences(difficulty_level);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_status ON experiences(status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_tags ON experiences USING GIN(tags);",
    ],
    
    "bookings": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_user_status ON bookings(user_id, status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_property_dates ON bookings(property_id, check_in_date, check_out_date);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_confirmation ON bookings(confirmation_code);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_created_at ON bookings(created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_check_in ON bookings(check_in_date);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_total_amount ON bookings(total_amount, currency);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_guest_count ON bookings(guest_count);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_bookings_booking_date ON bookings(booking_date);",
    ],
    
    "reviews": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_entity ON reviews(entity_type, entity_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_user_created ON reviews(user_id, created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_rating ON reviews(overall_rating);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_verified ON reviews(is_verified) WHERE is_verified = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_helpful_count ON reviews(helpful_count);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reviews_stay_date ON reviews(stay_date) WHERE stay_date IS NOT NULL;",
    ],
    
    "wishlists": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_wishlists_user_type ON wishlists(user_id, wishlist_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_wishlists_public ON wishlists(is_public) WHERE is_public = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_wishlists_collaborative ON wishlists(is_collaborative) WHERE is_collaborative = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_wishlists_tags ON wishlists USING GIN(tags);",
    ],
    
    "notifications": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_user_read ON notifications(user_id, is_read);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_type_created ON notifications(notification_type, created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_priority ON notifications(priority);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_entity ON notifications(related_entity_type, related_entity_id);",
    ],
    
    "media_files": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_entity ON media_files(entity_type, entity_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_user_type ON media_files(upload_user_id, media_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_status ON media_files(status);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_primary ON media_files(is_primary) WHERE is_primary = true;",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_public ON media_files(is_public);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_media_tags ON media_files USING GIN(tags);",
    ],
    
    "ai_conversations": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ai_conversations_user_active ON ai_conversations(user_id, is_active);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ai_conversations_session ON ai_conversations(session_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ai_conversations_type ON ai_conversations(conversation_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ai_conversations_activity ON ai_conversations(last_activity);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ai_conversations_satisfaction ON ai_conversations(user_satisfaction) WHERE user_satisfaction IS NOT NULL;",
    ],
    
    "user_behavior_analytics": [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_user_timestamp ON user_behavior_analytics(user_id, timestamp);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_session_type ON user_behavior_analytics(session_id, behavior_type);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_entity ON user_behavior_analytics(entity_type, entity_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_timestamp ON user_behavior_analytics(timestamp);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_country ON user_behavior_analytics(country_code);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_behavior_utm ON user_behavior_analytics(utm_source, utm_medium);",
    ]
}

# Full-text search indexes
FULLTEXT_INDEXES = [
    # Properties search
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_fts 
    ON properties USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(city, '') || ' ' || 
            COALESCE(country, '') || ' ' ||
            COALESCE(array_to_string(amenities, ' '), '')
        )
    );
    """,
    
    # POIs search
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_fts 
    ON pois USING GIN(
        to_tsvector('english', 
            COALESCE(name, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(city, '') || ' ' || 
            COALESCE(country, '') || ' ' ||
            COALESCE(array_to_string(tags, ' '), '')
        )
    );
    """,
    
    # Experiences search
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_fts 
    ON experiences USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(city, '') || ' ' || 
            COALESCE(country, '') || ' ' ||
            COALESCE(array_to_string(tags, ' '), '')
        )
    );
    """,
    
    # Users search (for admin)
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_fts 
    ON users USING GIN(
        to_tsvector('english', 
            COALESCE(first_name, '') || ' ' || 
            COALESCE(last_name, '') || ' ' || 
            COALESCE(email, '') || ' ' ||
            COALESCE(username, '')
        )
    );
    """,
]

# Geospatial indexes for location-based queries
GEOSPATIAL_INDEXES = [
    # Properties geospatial index
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_properties_geo 
    ON properties USING GIST(
        ST_Point(longitude::double precision, latitude::double precision)
    ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    """,
    
    # POIs geospatial index
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pois_geo 
    ON pois USING GIST(
        ST_Point(longitude::double precision, latitude::double precision)
    ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    """,
    
    # Experiences geospatial index
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_experiences_geo 
    ON experiences USING GIST(
        ST_Point(longitude::double precision, latitude::double precision)
    ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    """,
]

# Check constraints for data validation
CHECK_CONSTRAINTS = [
    # User constraints
    "ALTER TABLE users ADD CONSTRAINT ck_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');",
    "ALTER TABLE users ADD CONSTRAINT ck_users_phone_format CHECK (phone_number IS NULL OR phone_number ~* '^\\+?[1-9]\\d{1,14}$');",
    "ALTER TABLE users ADD CONSTRAINT ck_users_login_count CHECK (login_count >= 0);",
    "ALTER TABLE users ADD CONSTRAINT ck_users_failed_attempts CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10);",
    
    # Property constraints
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_price_positive CHECK (base_price > 0);",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_guests_positive CHECK (max_guests > 0);",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_bedrooms_valid CHECK (bedrooms IS NULL OR bedrooms >= 0);",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_bathrooms_valid CHECK (bathrooms IS NULL OR bathrooms >= 0);",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_coordinates_valid CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_longitude_valid CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_rating_range CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5));",
    "ALTER TABLE properties ADD CONSTRAINT ck_properties_minimum_nights CHECK (minimum_nights >= 1);",
    
    # Booking constraints
    "ALTER TABLE bookings ADD CONSTRAINT ck_bookings_dates_valid CHECK (check_out_date > check_in_date);",
    "ALTER TABLE bookings ADD CONSTRAINT ck_bookings_amount_positive CHECK (total_amount >= 0);",
    "ALTER TABLE bookings ADD CONSTRAINT ck_bookings_guests_positive CHECK (guest_count > 0);",
    
    # Review constraints
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_rating_range CHECK (overall_rating >= 1 AND overall_rating <= 5);",
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_sub_ratings CHECK (cleanliness_rating IS NULL OR (cleanliness_rating >= 1 AND cleanliness_rating <= 5));",
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_accuracy_rating CHECK (accuracy_rating IS NULL OR (accuracy_rating >= 1 AND accuracy_rating <= 5));",
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_communication_rating CHECK (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5));",
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_location_rating CHECK (location_rating IS NULL OR (location_rating >= 1 AND location_rating <= 5));",
    "ALTER TABLE reviews ADD CONSTRAINT ck_reviews_value_rating CHECK (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5));",
    
    # Experience constraints
    "ALTER TABLE experiences ADD CONSTRAINT ck_experiences_price_positive CHECK (base_price >= 0);",
    "ALTER TABLE experiences ADD CONSTRAINT ck_experiences_duration_positive CHECK (duration_hours > 0);",
    "ALTER TABLE experiences ADD CONSTRAINT ck_experiences_participants_positive CHECK (max_participants > 0);",
    "ALTER TABLE experiences ADD CONSTRAINT ck_experiences_min_age_valid CHECK (min_age IS NULL OR min_age >= 0);",
    "ALTER TABLE experiences ADD CONSTRAINT ck_experiences_rating_range CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5));",
    
    # POI constraints
    "ALTER TABLE pois ADD CONSTRAINT ck_pois_coordinates_valid CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));",
    "ALTER TABLE pois ADD CONSTRAINT ck_pois_longitude_valid CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));",
    "ALTER TABLE pois ADD CONSTRAINT ck_pois_rating_range CHECK (rating_overall IS NULL OR (rating_overall >= 0 AND rating_overall <= 5));",
    "ALTER TABLE pois ADD CONSTRAINT ck_pois_popularity_range CHECK (popularity_score >= 0 AND popularity_score <= 100);",
    "ALTER TABLE pois ADD CONSTRAINT ck_pois_entry_fee_positive CHECK (entry_fee IS NULL OR entry_fee >= 0);",
]

# Unique constraints for business rules
UNIQUE_CONSTRAINTS = [
    # User business rules
    "ALTER TABLE users ADD CONSTRAINT uq_users_email_active UNIQUE (email) WHERE is_active = true AND deleted_at IS NULL;",
    "ALTER TABLE users ADD CONSTRAINT uq_users_username_active UNIQUE (username) WHERE is_active = true AND deleted_at IS NULL;",
    
    # Booking business rules
    "ALTER TABLE bookings ADD CONSTRAINT uq_bookings_confirmation_code UNIQUE (confirmation_code);",
    
    # Property business rules
    "ALTER TABLE property_availability ADD CONSTRAINT uq_property_availability_date UNIQUE (property_id, date);",
    
    # Review business rules
    "ALTER TABLE reviews ADD CONSTRAINT uq_reviews_user_entity UNIQUE (user_id, entity_type, entity_id);",
    
    # Wishlist business rules
    "ALTER TABLE wishlist_items ADD CONSTRAINT uq_wishlist_items_unique UNIQUE (wishlist_id, item_type, item_id);",
    
    # Follow business rules
    "ALTER TABLE user_follows ADD CONSTRAINT uq_user_follows_pair UNIQUE (follower_id, following_id);",
    "ALTER TABLE user_follows ADD CONSTRAINT ck_no_self_follow CHECK (follower_id != following_id);",
]

# Database functions and triggers will be defined separately
DATABASE_FUNCTIONS = [
    # Function to update average ratings
    """
    CREATE OR REPLACE FUNCTION update_average_rating()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            UPDATE properties 
            SET average_rating = (
                SELECT AVG(overall_rating)::NUMERIC(3,2)
                FROM reviews 
                WHERE entity_type = 'property' 
                AND entity_id = NEW.entity_id
                AND deleted_at IS NULL
            ),
            review_count = (
                SELECT COUNT(*)
                FROM reviews 
                WHERE entity_type = 'property' 
                AND entity_id = NEW.entity_id
                AND deleted_at IS NULL
            )
            WHERE id = NEW.entity_id AND NEW.entity_type = 'property';
            
            RETURN NEW;
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            UPDATE properties 
            SET average_rating = (
                SELECT AVG(overall_rating)::NUMERIC(3,2)
                FROM reviews 
                WHERE entity_type = 'property' 
                AND entity_id = OLD.entity_id
                AND deleted_at IS NULL
            ),
            review_count = (
                SELECT COUNT(*)
                FROM reviews 
                WHERE entity_type = 'property' 
                AND entity_id = OLD.entity_id
                AND deleted_at IS NULL
            )
            WHERE id = OLD.entity_id AND OLD.entity_type = 'property';
            
            RETURN OLD;
        END IF;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Function to update timestamp
    """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Function to update search vectors
    """
    CREATE OR REPLACE FUNCTION update_search_vector()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_TABLE_NAME = 'properties' THEN
            UPDATE search_index 
            SET content = COALESCE(NEW.title, '') || ' ' || 
                         COALESCE(NEW.description, '') || ' ' || 
                         COALESCE(NEW.city, '') || ' ' || 
                         COALESCE(NEW.country, ''),
                search_vector = to_tsvector('english', 
                    COALESCE(NEW.title, '') || ' ' || 
                    COALESCE(NEW.description, '') || ' ' || 
                    COALESCE(NEW.city, '') || ' ' || 
                    COALESCE(NEW.country, '')),
                last_indexed = NOW()
            WHERE entity_type = 'property' AND entity_id = NEW.id;
            
            IF NOT FOUND THEN
                INSERT INTO search_index (entity_type, entity_id, language, content, search_vector, last_indexed)
                VALUES ('property', NEW.id, 'en', 
                       COALESCE(NEW.title, '') || ' ' || 
                       COALESCE(NEW.description, '') || ' ' || 
                       COALESCE(NEW.city, '') || ' ' || 
                       COALESCE(NEW.country, ''),
                       to_tsvector('english', 
                           COALESCE(NEW.title, '') || ' ' || 
                           COALESCE(NEW.description, '') || ' ' || 
                           COALESCE(NEW.city, '') || ' ' || 
                           COALESCE(NEW.country, '')),
                       NOW());
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
]

# Triggers to automatically maintain data integrity
DATABASE_TRIGGERS = [
    # Rating update triggers
    "CREATE TRIGGER tr_reviews_update_rating AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION update_average_rating();",
    
    # Updated at triggers
    "CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();",
    "CREATE TRIGGER tr_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();",
    "CREATE TRIGGER tr_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();",
    "CREATE TRIGGER tr_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();",
    
    # Search index update triggers
    "CREATE TRIGGER tr_properties_search_vector AFTER INSERT OR UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_search_vector();",
]