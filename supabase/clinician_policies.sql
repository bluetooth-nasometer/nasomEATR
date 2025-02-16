
-- First, enable RLS on the clinician table
ALTER TABLE clinician ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserting during signup
CREATE POLICY "Enable insert for authenticated users during signup" 
ON clinician 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to view their own data
CREATE POLICY "Enable read access for users to their own data" 
ON clinician 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Enable update access for users to their own data" 
ON clinician 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);


-- Drop the existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON clinician;

-- Create new policy that allows anyone to insert during signup
CREATE POLICY "Enable insert for signup"
ON clinician
FOR INSERT
TO public  -- Changed from 'authenticated' to 'public'
WITH CHECK (true);  -- Allow all inserts