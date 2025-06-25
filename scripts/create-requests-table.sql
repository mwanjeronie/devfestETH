-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS requests CASCADE;

-- Create requests table with comprehensive structure
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  amount DECIMAL(18,8) NOT NULL, -- Support for precise ETH amounts
  from_chain TEXT NOT NULL,
  to_chain TEXT NOT NULL,
  offering TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('exchange', 'help')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_user_address ON requests(user_address);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_chains ON requests(from_chain, to_chain);
CREATE INDEX idx_requests_amount ON requests(amount);

-- Create a composite index for common queries
CREATE INDEX idx_requests_status_created ON requests(status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a P2P platform)
DROP POLICY IF EXISTS "Anyone can view requests" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;

CREATE POLICY "Anyone can view requests" ON requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert requests" ON requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own requests" ON requests FOR UPDATE USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO requests (user_address, amount, from_chain, to_chain, message, type, status) VALUES
('0x1234567890123456789012345678901234567890', 0.005, 'Ethereum', 'Polygon', 'Need help with gas fees for my first DeFi transaction', 'help', 'active'),
('0x0987654321098765432109876543210987654321', 0.1, 'Polygon', 'Arbitrum', 'Looking to exchange MATIC for ETH on Arbitrum', 'exchange', 'active'),
('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 0.01, 'Base', 'Optimism', 'Need small amount for transaction fees', 'help', 'active');
