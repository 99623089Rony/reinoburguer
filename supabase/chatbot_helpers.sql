-- Additional helper function for chatbot
CREATE OR REPLACE FUNCTION increment_retry_count(conv_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE chatbot_conversations
    SET retry_count = retry_count + 1
    WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;
