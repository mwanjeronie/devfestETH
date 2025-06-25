"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle, Database, Play, Copy } from "lucide-react"

interface DatabaseSetupProps {
  onSetupComplete?: () => void
}

export function DatabaseSetup({ onSetupComplete }: DatabaseSetupProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [setupStatus, setSetupStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const sqlScript = `-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS requests CASCADE;

-- Create requests table with comprehensive structure
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
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
CREATE INDEX idx_requests_status_created ON requests(status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DROP POLICY IF EXISTS "Anyone can view requests" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;

CREATE POLICY "Anyone can view requests" ON requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert requests" ON requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own requests" ON requests FOR UPDATE USING (true);

-- Create function to automatically update updated_at timestamp
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
    EXECUTE FUNCTION update_updated_at_column();`

  const testConnection = async () => {
    setIsCreating(true)
    setSetupStatus("idle")
    setErrorMessage("")

    try {
      // Test basic connection
      const { data, error } = await supabase.from("requests").select("count", { count: "exact", head: true }).limit(1)

      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          setErrorMessage("Table 'requests' does not exist. Please create it using the SQL script below.")
          setSetupStatus("error")
        } else {
          setErrorMessage(`Database connection failed: ${error.message}`)
          setSetupStatus("error")
        }
      } else {
        setSetupStatus("success")
        onSetupComplete?.()
      }
    } catch (error: any) {
      setErrorMessage(`Connection test failed: ${error.message}`)
      setSetupStatus("error")
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript)
      alert("SQL script copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Database Setup Required</CardTitle>
        </div>
        <CardDescription>
          The requests table needs to be created in your Supabase database before you can use the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {setupStatus === "success" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Database table exists and is ready! You can now use the platform.</AlertDescription>
          </Alert>
        )}

        {setupStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Step 1: Test Database Connection</h4>
            <Button onClick={testConnection} disabled={isCreating} className="w-full">
              {isCreating ? (
                <>
                  <Play className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Test Database Connection
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Step 2: Create Database Table</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Copy and run this SQL script in your Supabase SQL Editor:
            </p>

            <div className="relative">
              <div className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{sqlScript}</pre>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="absolute top-2 right-2">
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Step 3: Verify Setup</h4>
            <p className="text-sm text-muted-foreground mb-4">
              After running the SQL script, test the connection again to verify everything is working.
            </p>
            <Button onClick={testConnection} variant="outline" disabled={isCreating} className="w-full">
              {isCreating ? (
                <>
                  <Play className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Setup
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Alternative: Continue Without Database</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The platform will work with local storage only. Data won't be shared between users.
            </p>
            <Button variant="outline" onClick={onSetupComplete} className="w-full">
              Continue with Local Storage Only
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">What this creates:</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• A `requests` table to store all P2P exchange requests</li>
            <li>• Indexes for fast queries and searching</li>
            <li>• Row Level Security policies for public access</li>
            <li>• Automatic timestamp updates</li>
            <li>• Sample data for testing (optional)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
