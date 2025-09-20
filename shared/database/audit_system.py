"""
Database Audit Trail and Trigger System

This module contains SQL scripts for creating comprehensive audit logging,
data integrity triggers, and automated data maintenance for the TouriQuest application.
"""

# Audit table creation SQL
AUDIT_TABLE_SQL = """
-- Create audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    application_name VARCHAR(100),
    transaction_id BIGINT DEFAULT txid_current(),
    
    -- Indexes for performance
    CONSTRAINT idx_audit_log_table_record UNIQUE (table_name, record_id, timestamp),
    CONSTRAINT idx_audit_log_timestamp CHECK (timestamp IS NOT NULL)
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_session_id ON audit_log(session_id);

-- Create partial index for recent changes (last 30 days)
CREATE INDEX IF NOT EXISTS idx_audit_log_recent ON audit_log(timestamp) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Add GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_audit_log_old_values ON audit_log USING GIN(old_values);
CREATE INDEX IF NOT EXISTS idx_audit_log_new_values ON audit_log USING GIN(new_values);
"""

# Generic audit trigger function
AUDIT_TRIGGER_FUNCTION = """
-- Create a generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB := '{}';
    new_values JSONB := '{}';
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    current_user_id UUID;
    current_user_email VARCHAR(255);
    current_ip_address INET;
    current_user_agent TEXT;
    current_session_id VARCHAR(100);
    audit_action VARCHAR(20);
    record_id UUID;
BEGIN
    -- Get current user context from application
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
    current_user_email := COALESCE(
        current_setting('app.current_user_email', true),
        NULL
    );
    current_ip_address := COALESCE(
        current_setting('app.current_ip_address', true)::INET,
        NULL
    );
    current_user_agent := COALESCE(
        current_setting('app.current_user_agent', true),
        NULL
    );
    current_session_id := COALESCE(
        current_setting('app.current_session_id', true),
        NULL
    );

    -- Determine action and record ID
    IF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        record_id := OLD.id;
        old_values := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        record_id := NEW.id;
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
        
        -- Find changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(old_values) o(key, value)
            FULL OUTER JOIN jsonb_each(new_values) n(key, value) USING (key)
            WHERE o.value IS DISTINCT FROM n.value
            AND key NOT IN ('updated_at', 'metadata')  -- Exclude system fields
        ) AS changes;
        
    ELSIF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
        record_id := NEW.id;
        new_values := to_jsonb(NEW);
    END IF;

    -- Insert audit record
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        user_email,
        ip_address,
        user_agent,
        session_id,
        application_name
    ) VALUES (
        TG_TABLE_NAME,
        record_id,
        audit_action,
        old_values,
        new_values,
        changed_fields,
        current_user_id,
        current_user_email,
        current_ip_address,
        current_user_agent,
        current_session_id,
        'touriquest'
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Audit trigger failed: %', SQLERRM;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

# Data integrity trigger functions
DATA_INTEGRITY_FUNCTIONS = [
    # Function to maintain referential integrity for soft deletes
    """
    CREATE OR REPLACE FUNCTION prevent_delete_with_references()
    RETURNS TRIGGER AS $$
    DECLARE
        ref_count INTEGER;
    BEGIN
        -- Check for active bookings when deleting a property
        IF TG_TABLE_NAME = 'properties' THEN
            SELECT COUNT(*) INTO ref_count
            FROM bookings 
            WHERE property_id = OLD.id 
            AND status IN ('confirmed', 'checked_in')
            AND deleted_at IS NULL;
            
            IF ref_count > 0 THEN
                RAISE EXCEPTION 'Cannot delete property with active bookings';
            END IF;
        END IF;
        
        -- Check for active experiences when deleting a provider
        IF TG_TABLE_NAME = 'users' AND OLD.user_type = 'provider' THEN
            SELECT COUNT(*) INTO ref_count
            FROM experiences 
            WHERE provider_id = OLD.id 
            AND status = 'active'
            AND deleted_at IS NULL;
            
            IF ref_count > 0 THEN
                RAISE EXCEPTION 'Cannot delete user with active experiences';
            END IF;
        END IF;
        
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Function to automatically update counters
    """
    CREATE OR REPLACE FUNCTION update_counters()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Update property booking count
        IF TG_TABLE_NAME = 'bookings' THEN
            IF TG_OP = 'INSERT' THEN
                UPDATE properties 
                SET booking_count = booking_count + 1,
                    last_booked = NEW.created_at
                WHERE id = NEW.property_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE properties 
                SET booking_count = GREATEST(0, booking_count - 1)
                WHERE id = OLD.property_id;
            END IF;
        END IF;
        
        -- Update wishlist item count
        IF TG_TABLE_NAME = 'wishlist_items' THEN
            IF TG_OP = 'INSERT' THEN
                UPDATE wishlists 
                SET item_count = item_count + 1
                WHERE id = NEW.wishlist_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE wishlists 
                SET item_count = GREATEST(0, item_count - 1)
                WHERE id = OLD.wishlist_id;
            END IF;
        END IF;
        
        -- Update follower/following counts
        IF TG_TABLE_NAME = 'user_follows' THEN
            IF TG_OP = 'INSERT' THEN
                UPDATE user_social_profiles 
                SET following_count = following_count + 1
                WHERE user_id = NEW.follower_id;
                
                UPDATE user_social_profiles 
                SET follower_count = follower_count + 1
                WHERE user_id = NEW.following_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE user_social_profiles 
                SET following_count = GREATEST(0, following_count - 1)
                WHERE user_id = OLD.follower_id;
                
                UPDATE user_social_profiles 
                SET follower_count = GREATEST(0, follower_count - 1)
                WHERE user_id = OLD.following_id;
            END IF;
        END IF;
        
        -- Update post engagement counts
        IF TG_TABLE_NAME = 'post_likes' THEN
            IF TG_OP = 'INSERT' THEN
                UPDATE social_posts 
                SET like_count = like_count + 1
                WHERE id = NEW.post_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE social_posts 
                SET like_count = GREATEST(0, like_count - 1)
                WHERE id = OLD.post_id;
            END IF;
        END IF;
        
        IF TG_TABLE_NAME = 'post_comments' THEN
            IF TG_OP = 'INSERT' THEN
                UPDATE social_posts 
                SET comment_count = comment_count + 1
                WHERE id = NEW.post_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE social_posts 
                SET comment_count = GREATEST(0, comment_count - 1)
                WHERE id = OLD.post_id;
            END IF;
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Function to maintain data consistency
    """
    CREATE OR REPLACE FUNCTION maintain_data_consistency()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Ensure booking dates don't overlap for the same property
        IF TG_TABLE_NAME = 'bookings' AND TG_OP IN ('INSERT', 'UPDATE') THEN
            IF EXISTS (
                SELECT 1 FROM bookings 
                WHERE property_id = NEW.property_id 
                AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
                AND status IN ('confirmed', 'checked_in')
                AND deleted_at IS NULL
                AND (
                    (NEW.check_in_date, NEW.check_out_date) OVERLAPS 
                    (check_in_date, check_out_date)
                )
            ) THEN
                RAISE EXCEPTION 'Booking dates overlap with existing booking';
            END IF;
        END IF;
        
        -- Ensure experience capacity is not exceeded
        IF TG_TABLE_NAME = 'experience_bookings' AND TG_OP IN ('INSERT', 'UPDATE') THEN
            DECLARE
                current_bookings INTEGER;
                max_capacity INTEGER;
            BEGIN
                SELECT COALESCE(SUM(participant_count), 0), e.max_participants
                INTO current_bookings, max_capacity
                FROM experience_bookings eb
                JOIN experiences e ON e.id = eb.experience_id
                WHERE eb.experience_id = NEW.experience_id
                AND eb.booking_date = NEW.booking_date
                AND eb.time_slot = NEW.time_slot
                AND eb.status IN ('confirmed', 'checked_in')
                AND eb.deleted_at IS NULL
                AND eb.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
                GROUP BY e.max_participants;
                
                IF current_bookings + NEW.participant_count > max_capacity THEN
                    RAISE EXCEPTION 'Experience capacity exceeded';
                END IF;
            END;
        END IF;
        
        -- Prevent users from reviewing the same entity multiple times
        IF TG_TABLE_NAME = 'reviews' AND TG_OP IN ('INSERT', 'UPDATE') THEN
            IF EXISTS (
                SELECT 1 FROM reviews
                WHERE user_id = NEW.user_id
                AND entity_type = NEW.entity_type
                AND entity_id = NEW.entity_id
                AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
                AND deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION 'User has already reviewed this entity';
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Function to cleanup expired data
    """
    CREATE OR REPLACE FUNCTION cleanup_expired_data()
    RETURNS void AS $$
    BEGIN
        -- Clean up expired user sessions
        DELETE FROM user_sessions 
        WHERE expires_at < NOW();
        
        -- Clean up expired notifications
        UPDATE notifications 
        SET deleted_at = NOW()
        WHERE scheduled_for IS NOT NULL 
        AND scheduled_for < NOW() - INTERVAL '7 days'
        AND deleted_at IS NULL;
        
        -- Clean up old activity feed entries (keep last 90 days)
        DELETE FROM activity_feed 
        WHERE created_at < NOW() - INTERVAL '90 days';
        
        -- Clean up old behavior analytics (keep last 180 days)
        DELETE FROM user_behavior_analytics 
        WHERE timestamp < NOW() - INTERVAL '180 days';
        
        -- Clean up old audit logs (keep last 2 years)
        DELETE FROM audit_log 
        WHERE timestamp < NOW() - INTERVAL '2 years';
        
        RAISE NOTICE 'Expired data cleanup completed';
    END;
    $$ LANGUAGE plpgsql;
    """
]

# Create triggers for all auditable tables
AUDIT_TRIGGERS = [
    "CREATE TRIGGER tr_audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_user_profiles AFTER INSERT OR UPDATE OR DELETE ON user_profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_properties AFTER INSERT OR UPDATE OR DELETE ON properties FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_reviews AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_experiences AFTER INSERT OR UPDATE OR DELETE ON experiences FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_pois AFTER INSERT OR UPDATE OR DELETE ON pois FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
    "CREATE TRIGGER tr_audit_user_auth AFTER INSERT OR UPDATE OR DELETE ON user_auth FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();",
]

# Data integrity triggers
INTEGRITY_TRIGGERS = [
    "CREATE TRIGGER tr_prevent_delete_properties BEFORE DELETE ON properties FOR EACH ROW EXECUTE FUNCTION prevent_delete_with_references();",
    "CREATE TRIGGER tr_prevent_delete_users BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION prevent_delete_with_references();",
    "CREATE TRIGGER tr_maintain_booking_consistency BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION maintain_data_consistency();",
    "CREATE TRIGGER tr_maintain_experience_booking_consistency BEFORE INSERT OR UPDATE ON experience_bookings FOR EACH ROW EXECUTE FUNCTION maintain_data_consistency();",
    "CREATE TRIGGER tr_maintain_review_consistency BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION maintain_data_consistency();",
]

# Counter update triggers
COUNTER_TRIGGERS = [
    "CREATE TRIGGER tr_update_booking_counters AFTER INSERT OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION update_counters();",
    "CREATE TRIGGER tr_update_wishlist_counters AFTER INSERT OR DELETE ON wishlist_items FOR EACH ROW EXECUTE FUNCTION update_counters();",
    "CREATE TRIGGER tr_update_follow_counters AFTER INSERT OR DELETE ON user_follows FOR EACH ROW EXECUTE FUNCTION update_counters();",
    "CREATE TRIGGER tr_update_like_counters AFTER INSERT OR DELETE ON post_likes FOR EACH ROW EXECUTE FUNCTION update_counters();",
    "CREATE TRIGGER tr_update_comment_counters AFTER INSERT OR DELETE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_counters();",
]

# Scheduled maintenance procedures
MAINTENANCE_PROCEDURES = [
    # Daily cleanup procedure
    """
    CREATE OR REPLACE FUNCTION daily_maintenance()
    RETURNS void AS $$
    BEGIN
        -- Run cleanup
        PERFORM cleanup_expired_data();
        
        -- Update statistics
        ANALYZE;
        
        -- Log maintenance completion
        INSERT INTO system_health (
            service_name,
            metric_name,
            metric_value,
            unit,
            status,
            additional_data
        ) VALUES (
            'database',
            'daily_maintenance',
            1,
            'completed',
            'healthy',
            jsonb_build_object('timestamp', NOW())
        );
        
    END;
    $$ LANGUAGE plpgsql;
    """,
    
    # Weekly maintenance procedure
    """
    CREATE OR REPLACE FUNCTION weekly_maintenance()
    RETURNS void AS $$
    BEGIN
        -- Reindex heavily used tables
        REINDEX TABLE users;
        REINDEX TABLE properties;
        REINDEX TABLE bookings;
        REINDEX TABLE reviews;
        
        -- Update table statistics
        ANALYZE users;
        ANALYZE properties;
        ANALYZE bookings;
        ANALYZE reviews;
        
        -- Log maintenance completion
        INSERT INTO system_health (
            service_name,
            metric_name,
            metric_value,
            unit,
            status,
            additional_data
        ) VALUES (
            'database',
            'weekly_maintenance',
            1,
            'completed',
            'healthy',
            jsonb_build_object('timestamp', NOW())
        );
        
    END;
    $$ LANGUAGE plpgsql;
    """
]

# Complete audit system installation script
INSTALL_AUDIT_SYSTEM = f"""
-- Install complete audit and trigger system
BEGIN;

{AUDIT_TABLE_SQL}

{AUDIT_TRIGGER_FUNCTION}

{chr(10).join(DATA_INTEGRITY_FUNCTIONS)}

-- Create all triggers
{chr(10).join(AUDIT_TRIGGERS)}
{chr(10).join(INTEGRITY_TRIGGERS)}
{chr(10).join(COUNTER_TRIGGERS)}

-- Create maintenance procedures
{chr(10).join(MAINTENANCE_PROCEDURES)}

-- Grant permissions
GRANT SELECT, INSERT ON audit_log TO PUBLIC;
GRANT EXECUTE ON FUNCTION audit_trigger_function() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO PUBLIC;
GRANT EXECUTE ON FUNCTION daily_maintenance() TO PUBLIC;
GRANT EXECUTE ON FUNCTION weekly_maintenance() TO PUBLIC;

COMMIT;
"""