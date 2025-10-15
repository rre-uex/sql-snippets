-- Test query to verify PK detection for composite primary keys

WITH RECURSIVE
table_info AS (
    SELECT 
        m.name as table_name,
        i.name as column_name,
        TRIM(SUBSTR(i.type, 1, CASE 
            WHEN INSTR(i.type, '(') = 0 THEN LENGTH(i.type)
            ELSE INSTR(i.type, '(') - 1
        END)) as column_type,
        i.pk as is_primary_key,
        i."notnull" as is_not_null
    FROM sqlite_master m
    JOIN pragma_table_info(m.name) i
    WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
),
table_relations AS (
    SELECT DISTINCT
        table_name,
        group_concat('    ' || column_type || ' ' || column_name || 
            CASE 
                WHEN is_primary_key > 0 THEN ' PK'  -- Fixed: any positive value means it's part of PK
                WHEN is_not_null = 1 AND EXISTS(
                    SELECT 1 FROM sqlite_master sm 
                    JOIN pragma_foreign_key_list(sm.name) fk ON sm.name = table_name 
                    WHERE fk."from" = column_name AND sm.type = 'table'
                ) THEN ' FK'
                ELSE ''
            END, char(10)) as columns
    FROM table_info
    GROUP BY table_name
)
SELECT 
    table_name,
    columns
FROM table_relations
WHERE table_name = 'modelos';