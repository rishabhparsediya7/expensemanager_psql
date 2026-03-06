-- Create function to handle mutual friendship
CREATE OR REPLACE FUNCTION create_mutual_friendship()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the status is being set to 'accepted' and it wasn't already 'accepted'
    IF (NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted')) THEN
        -- Insert or update the reverse record to 'accepted'
        -- We use ON CONFLICT to handle if the record was already created as pending
        INSERT INTO "friends" (user_id, friend_id, status)
        VALUES (NEW.friend_id, NEW.user_id, 'accepted')
        ON CONFLICT (user_id, friend_id) DO UPDATE
        SET status = 'accepted'
        WHERE "friends".status != 'accepted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on the friends table
DROP TRIGGER IF EXISTS trigger_create_mutual_friendship ON "friends";
CREATE TRIGGER trigger_create_mutual_friendship
AFTER INSERT OR UPDATE ON "friends"
FOR EACH ROW
EXECUTE FUNCTION create_mutual_friendship();