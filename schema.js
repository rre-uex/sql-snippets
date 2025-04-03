async function createSchema(db) {
    // Taken from: https://gist.github.com/jasonrdsouza/00c46c4e541a540463587c0999ae6a78
    const query = `
    SELECT '
    digraph structs {
        graph [fontname="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" fontsize=12 bgcolor="#ffffff"];
        node [fontname="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" fontsize=12];
        edge [fontname="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" fontsize=10 color="#007BFF"];
        '
        UNION ALL
        SELECT '
        rankdir="LR"
        '
        UNION ALL
        SELECT '
        node [shape=none]
        '
        UNION ALL
        SELECT
            CASE
        WHEN LAG(t.name, 1) OVER (ORDER BY t.name) = t.name THEN ''
        ELSE
                    t.name || ' [label=<
                    <TABLE BORDER="0" CELLSPACING="0" CELLBORDER="1" COLOR="#007BFF" BGCOLOR="#ffffff">
                        <TR>
                            <TD COLSPAN="3" BGCOLOR="#007BFF"><FONT COLOR="#f9f9f9"><B>' || t.name || '</B></FONT></TD>
                        </TR>
                    '
            END || '
                        <TR>
                            <TD PORT="' || i.name || '_to">' ||
                                CASE i.pk WHEN 0 THEN '&nbsp;' ELSE '&#128273; ' END ||
                            '</TD>
                            <TD PORT="' || i.name || '_type"><FONT COLOR="#555555">' || i.type || '</FONT></TD>
                            <TD PORT="' || i.name || '_from"><FONT COLOR="#333333">' || i.name || '</FONT></TD>
                        </TR>
                    ' ||
            CASE
                WHEN LEAD(t.name, 1) OVER (ORDER BY t.name) = t.name THEN ''
        ELSE '
                    </TABLE>
                >];
                '
            END
        FROM pragma_table_list() AS t
            JOIN pragma_table_info(t.name, t.schema) AS i
        WHERE
         t.name NOT LIKE 'sqlite_%'
        AND t.type = 'table'
        UNION ALL
        SELECT
            t.name || ':' || f."from" || '_from:e -> ' ||
            f."table" || ':' || f."to" || '_to:w'
        FROM pragma_table_list() AS t
            JOIN pragma_foreign_key_list(t.name, t.schema) AS f
        UNION ALL
        SELECT '
    }';`
    const graphviz = db.exec(query)[0].values.join("\n");
    // Using Viz.js from: https://github.com/mdaines/viz-js
    Viz.instance().then(function (viz) {
        const graphDiv = document.getElementById("graph");
        graphDiv.innerHTML = '';
        const svg = viz.renderSVGElement(graphviz);
        svg.style.margin = "0 auto";
        svg.style.display = "block";
        svg.style.backgroundColor = "#f9f9f9";
        graphDiv.appendChild(svg);
    });
}

async function createSchemaMermaid(db) {
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
                    WHEN is_not_null = 1 THEN ' FK'
                    ELSE ''
                END, char(10)) as columns
        FROM table_info
        GROUP BY table_name
    ),
    fk_info AS (
        SELECT 
            m.name as table_name,
            fk."from" as column_name,
            fk."table" as referenced_table,
            fk."to" as referenced_column
        FROM sqlite_master m
        JOIN pragma_foreign_key_list(m.name) fk
        WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
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
               fk.table_name || ' ||--o{ ' || fk.referenced_table || ' : references',
               NULL,
               2
        FROM fk_info fk
        ORDER BY ord, line
    );`;

    const mermaidDefinition = db.exec(query)[0].values.join("\n");
    const graphDiv = document.getElementById("graph");
    graphDiv.innerHTML = `<pre id="mermaid">${mermaidDefinition}</pre>`;
    
    // Initialize or reinitialize Mermaid
    if (window.mermaid) {
        window.mermaid.init(undefined, document.getElementById("mermaid"));
    }
}