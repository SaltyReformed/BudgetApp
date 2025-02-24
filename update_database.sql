-- Connect to your SQLite database
-- sqlite3 path/to/your/database.db
-- Add the new columns
ALTER TABLE expense
ADD COLUMN frequency_type VARCHAR(10);
ALTER TABLE expense
ADD COLUMN frequency_value INTEGER;
-- Update existing recurring expenses
UPDATE expense
SET frequency_type = 'days',
    frequency_value = 1
WHERE recurring = 1
    AND frequency = 'daily';
UPDATE expense
SET frequency_type = 'weeks',
    frequency_value = 1
WHERE recurring = 1
    AND frequency = 'weekly';
UPDATE expense
SET frequency_type = 'weeks',
    frequency_value = 2
WHERE recurring = 1
    AND frequency = 'bi-weekly';
UPDATE expense
SET frequency_type = 'months',
    frequency_value = 1
WHERE recurring = 1
    AND frequency = 'monthly';
UPDATE expense
SET frequency_type = 'months',
    frequency_value = 3
WHERE recurring = 1
    AND frequency = 'quarterly';
UPDATE expense
SET frequency_type = 'months',
    frequency_value = 6
WHERE recurring = 1
    AND frequency = 'semi-annually';
UPDATE expense
SET frequency_type = 'years',
    frequency_value = 1
WHERE recurring = 1
    AND frequency = 'annually';