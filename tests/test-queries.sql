-- Test queries to diagnose the row limit issue

-- 1. Count total rows 
SELECT 'Total rows in penguins:' as info, COUNT(*) as count FROM penguins;

-- 2. Test with LIMIT to see if specific limits work
SELECT 'First 10 rows' as test;
SELECT * FROM penguins LIMIT 10;

SELECT 'Rows 1-40' as test;  
SELECT * FROM penguins LIMIT 40;

SELECT 'Rows 1-41' as test;
SELECT * FROM penguins LIMIT 41;

SELECT 'Rows 1-50' as test;
SELECT * FROM penguins LIMIT 50;

SELECT 'Rows 1-100' as test;
SELECT * FROM penguins LIMIT 100;

-- 3. Test without LIMIT (this should show all rows)
SELECT 'All rows without LIMIT' as test;
SELECT * FROM penguins;