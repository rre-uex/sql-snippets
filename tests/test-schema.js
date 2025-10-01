#!/usr/bin/env node

// Prueba de la función createSchemaMermaid mejorada
const sqlite3 = require('sqlite3').verbose();

function testSchemaMermaid(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        const query = `
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
                        WHEN is_primary_key = 1 THEN ' PK'
                        WHEN is_not_null = 1 AND EXISTS(
                            SELECT 1 FROM sqlite_master sm 
                            JOIN pragma_foreign_key_list(sm.name) fk ON sm.name = table_name 
                            WHERE fk."from" = column_name AND sm.type = 'table'
                        ) THEN ' FK'
                        ELSE ''
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
                -- Agrupar FK compuestas por ID de relación
                fk.id as fk_group_id
            FROM sqlite_master m
            JOIN pragma_foreign_key_list(m.name) fk
            WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
        ),
        relationship_summary AS (
            SELECT DISTINCT
                table_name,
                referenced_table,
                -- Determinar cardinalidad y opcionalidad
                CASE 
                    -- Si todas las columnas FK son PK → relación 1:1
                    WHEN MIN(fk_is_pk) = 1 AND MAX(fk_is_pk) = 1 THEN
                        CASE 
                            WHEN MIN(fk_nullable) = 1 THEN '||--o|'  -- 1:1 opcional
                            ELSE '||--||'  -- 1:1 obligatoria
                        END
                    -- Si alguna columna FK es PK pero no todas → relación 1:N (lado N es PK parcial)
                    WHEN MAX(fk_is_pk) = 1 THEN
                        CASE 
                            WHEN MIN(fk_nullable) = 1 THEN '||--o{'  -- 1:N opcional
                            ELSE '||--|{'  -- 1:N obligatoria
                        END
                    -- Relación 1:N normal
                    ELSE
                        CASE 
                            WHEN MIN(fk_nullable) = 1 THEN '||--o{'  -- 1:N opcional
                            ELSE '||--|{'  -- 1:N obligatoria
                        END
                END as relationship_type,
                group_concat(column_name, ', ') as fk_columns
            FROM fk_detailed_info
            GROUP BY table_name, referenced_table, fk_group_id
        )
        SELECT group_concat(
            CASE 
                WHEN section = 'header' THEN line
                WHEN section = 'tables' THEN line || ' {' || char(10) || columns || '}'
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
                   rs.referenced_table || ' ' || rs.relationship_type || ' ' || rs.table_name || ' : "' || rs.fk_columns || '"',
                   NULL,
                   2
            FROM relationship_summary rs
            ORDER BY ord, line
        );`;
        
        db.get(query, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.diagram);
            }
            db.close();
        });
    });
}

// Probar con la base de datos empresa
testSchemaMermaid('./db/empresa.db')
    .then(result => {
        console.log('=== EMPRESA DB ===');
        console.log(result);
        console.log('\n');
        return testSchemaMermaid('./db/dgt.db');
    })
    .then(result => {
        console.log('=== DGT DB ===');
        console.log(result);
    })
    .catch(err => {
        console.error('Error:', err);
    });