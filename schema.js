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