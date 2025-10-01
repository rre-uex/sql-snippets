-- Test query for improved schema relationships
-- Run this in SQLite to see the Mermaid output

SELECT 'Testing empresa.db relationships:' as info;

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
fk_detailed_info AS (
    SELECT 
        m.name as table_name,
        fk."from" as column_name,
        fk."table" as referenced_table,
        fk."to" as referenced_column,
        -- Determinar si la FK es parte de la PK (relación 1:1 potencial)
        CASE WHEN EXISTS(
            SELECT 1 FROM pragma_table_info(m.name) ti 
            WHERE ti.name = fk."from" AND ti.pk > 0
        ) THEN 1 ELSE 0 END as fk_is_pk,
        -- Determinar opcionalidad (si la columna FK permite NULL)
        CASE WHEN EXISTS(
            SELECT 1 FROM pragma_table_info(m.name) ti 
            WHERE ti.name = fk."from" AND ti."notnull" = 0
        ) THEN 1 ELSE 0 END as fk_nullable,
        -- Determinar si la FK tiene constraint UNIQUE (indica relación 1:1)
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
        -- Agrupar FK compuestas por ID de relación
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
        -- Determinar cardinalidad y opcionalidad
        CASE 
            -- Si todas las columnas FK tienen UNIQUE constraint → relación 1:1
            WHEN MIN(fk.fk_is_unique) = 1 AND MAX(fk.fk_is_unique) = 1 THEN
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o|'  -- 1:1 opcional
                    ELSE '||--||'  -- 1:1 obligatoria
                END
            -- Si todas las columnas FK son PK Y representan toda la PK → relación 1:1
            WHEN MIN(fk.fk_is_pk) = 1 AND MAX(fk.fk_is_pk) = 1 
                 AND COUNT(fk.column_name) = COALESCE(pk.total_pk_columns, 0) THEN
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o|'  -- 1:1 opcional
                    ELSE '||--||'  -- 1:1 obligatoria
                END
            -- Cualquier otra situación → relación 1:N
            ELSE
                CASE 
                    WHEN MIN(fk.fk_nullable) = 1 THEN '||--o{'  -- 1:N opcional
                    ELSE '||--|{'  -- 1:N obligatoria
                END
        END as relationship_type,
        group_concat(fk.column_name, ', ') as fk_columns,
        MIN(fk.fk_is_pk) as min_pk,
        MAX(fk.fk_is_pk) as max_pk,
        MIN(fk.fk_nullable) as min_nullable,
        MIN(fk.fk_is_unique) as min_unique,
        MAX(fk.fk_is_unique) as max_unique,
        COUNT(fk.column_name) as fk_count,
        COALESCE(pk.total_pk_columns, 0) as total_pk
    FROM fk_detailed_info fk
    LEFT JOIN pk_column_count pk ON fk.table_name = pk.table_name
    GROUP BY fk.table_name, fk.referenced_table, fk.fk_group_id
)
SELECT 
    'Relationship: ' || referenced_table || ' ' || relationship_type || ' ' || table_name || ' : ' || fk_columns as mermaid_relation,
    'FK is PK: ' || min_pk || '-' || max_pk as pk_info,
    'FK nullable: ' || min_nullable as nullable_info,
    'FK is UNIQUE: ' || min_unique || '-' || max_unique as unique_info,
    'FK count vs Total PK: ' || fk_count || '/' || total_pk as count_info
FROM relationship_summary;