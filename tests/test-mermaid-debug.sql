-- Test to see the exact Mermaid output for empresabd.db

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
                WHEN is_primary_key > 0 AND EXISTS(
                    SELECT 1 FROM sqlite_master sm 
                    JOIN pragma_foreign_key_list(sm.name) fk ON sm.name = table_name 
                    WHERE fk."from" = column_name AND sm.type = 'table'
                ) THEN ' PK, FK'  -- Both PK and FK with comma
                WHEN is_primary_key > 0 THEN ' PK'  -- Only PK
                WHEN EXISTS(
                    SELECT 1 FROM sqlite_master sm 
                    JOIN pragma_foreign_key_list(sm.name) fk ON sm.name = table_name 
                    WHERE fk."from" = column_name AND sm.type = 'table'
                ) THEN ' FK'  -- Only FK
                ELSE ''  -- Neither PK nor FK
            END, char(10)) as columns
    FROM table_info
    GROUP BY table_name
),
fk_detailed_info AS (
    SELECT 
        m.name as table_name,
        fk."from" as column_name,
        fk."table" as referenced_table,
        fk."to" as referenced_column,
        CASE WHEN EXISTS(
            SELECT 1 FROM pragma_table_info(m.name) ti 
            WHERE ti.name = fk."from" AND ti.pk > 0
        ) THEN 1 ELSE 0 END as fk_is_pk,
        CASE WHEN EXISTS(
            SELECT 1 FROM pragma_table_info(m.name) ti 
            WHERE ti.name = fk."from" AND ti."notnull" = 0
        ) THEN 1 ELSE 0 END as fk_nullable,
        CASE WHEN (
            SELECT sql FROM sqlite_master WHERE type='table' AND name = m.name
        ) LIKE '%' || fk."from" || '% UNIQUE%'
        OR (
            SELECT sql FROM sqlite_master WHERE type='table' AND name = m.name
        ) LIKE '%UNIQUE (' || fk."from" || ')%'
        OR (
            SELECT sql FROM sqlite_master WHERE type='table' AND name = m.name
        ) LIKE '%UNIQUE(' || fk."from" || ')%'
        THEN 1 ELSE 0 END as fk_is_unique,
        fk.id as fk_group_id
    FROM sqlite_master m
    JOIN pragma_foreign_key_list(m.name) fk
    WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
),
pk_column_count AS (
    SELECT 
        m.name as table_name,
        COUNT(*) as total_pk_columns
    FROM sqlite_master m
    JOIN pragma_table_info(m.name) i ON i.pk > 0
    WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
    GROUP BY m.name
),
relationship_summary AS (
    SELECT DISTINCT
        fk.table_name,
        fk.referenced_table,
        CASE 
            WHEN MIN(fk.fk_is_unique) = 1 AND MAX(fk.fk_is_unique) = 1 THEN
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o|'
                    ELSE '||--||'
                END
            WHEN MIN(fk.fk_is_pk) = 1 AND MAX(fk.fk_is_pk) = 1 
                 AND COUNT(fk.column_name) = COALESCE(pk.total_pk_columns, 0) THEN
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o|'
                    ELSE '||--||'
                END
            ELSE
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o{'
                    ELSE '||--|{'
                END
        END as relationship_type,
        group_concat(fk.column_name, ', ') as fk_columns
    FROM fk_detailed_info fk
    LEFT JOIN pk_column_count pk ON fk.table_name = pk.table_name
    GROUP BY fk.table_name, fk.referenced_table, fk.fk_group_id
)
SELECT group_concat(
    CASE 
        WHEN section = 'header' THEN line
        WHEN section = 'tables' THEN line || ' {' || char(10) || columns || char(10) || '}'
        WHEN section = 'relations' THEN line
    END, 
    char(10)
) as diagram
FROM (
    SELECT 'header' as section, 'erDiagram' as line, NULL as columns, 0 as ord
    UNION ALL
    SELECT 'tables', tr.table_name, tr.columns, 1
    FROM table_relations tr
    UNION ALL
    SELECT 'relations', 
           rs.referenced_table || ' ' || rs.relationship_type || ' ' || rs.table_name || ' : ' || rs.fk_columns,
           NULL,
           2
    FROM relationship_summary rs
    ORDER BY ord, line
);