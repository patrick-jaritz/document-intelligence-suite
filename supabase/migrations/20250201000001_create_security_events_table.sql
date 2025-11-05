-- Create security_events table for security monitoring and audit logging

CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  function_name TEXT NOT NULL,
  request_id TEXT,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_function_name ON security_events(function_name);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);

-- Create RLS policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert security events
CREATE POLICY "Service role can insert security events"
  ON security_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can view their own security events
CREATE POLICY "Users can view their own security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can view all security events
CREATE POLICY "Service role can view all security events"
  ON security_events FOR SELECT
  TO service_role
  USING (true);

-- Partition table by month for better performance (optional, can be added later)
-- This would require pg_partman extension

COMMENT ON TABLE security_events IS 'Security event logging for audit and monitoring';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (e.g., authentication_failure, rate_limit_exceeded)';
COMMENT ON COLUMN security_events.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN security_events.details IS 'Additional event details as JSON';

