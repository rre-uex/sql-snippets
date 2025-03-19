async function myInitSqlJs() {
    let db;
    try {
        const response = await fetch('db/empresasimple.db'); // Replace with your remote database URL
        const buffer = await response.arrayBuffer();
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/${file}`
        });
        db = new SQL.Database(new Uint8Array(buffer));
    } catch (remoteError) {
        console.warn("Failed to load remote database:", remoteError);
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/${file}`
        });
        db = new SQL.Database();
        db.run("CREATE TABLE students (id INTEGER, name TEXT, grade INTEGER);");
        db.run("INSERT INTO students VALUES (1, 'Alice', 90), (2, 'Bob', 85), (3, 'Charlie', 95);");

        // Show warning dialog using alert()
        const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table';")[0].values.map(row => row[0]);
        const tableList = tableNames.join(', ');
        const dialogMessage = `Failed to load remote database. An example database has been created with tables: ${tableList}`;
        document.getElementById("dialogMessage").textContent = dialogMessage;
        document.getElementById("warningDialog").showModal();

        //Display tables in the results div
        //const tableListHTML = tableNames.map(name => `<li>${name}</li>`).join('');
        //document.getElementById("results").innerHTML = `<ul>${tableListHTML}</ul>`;
        document.getElementById("sqlEditor").value = "-- Run this query to get database schema\nSELECT * FROM sqlite_master;";

    }
    return db;
}

async function main() {
    const db = await myInitSqlJs();

    const editor = CodeMirror.fromTextArea(document.getElementById("sqlEditor"), {
        mode: "text/x-sql",
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets : true,
        autofocus: true
    });

    document.getElementById("runButton").addEventListener("click", () => {
        const sql = editor.getValue();
        try {
            const results = db.exec(sql);
            displayResults(results);
        } catch (error) {
            // Improved error handling
            const errorMessage = error.message;
            let detailedMessage = errorMessage;

            if (errorMessage.includes("near")) {
                const nearIndex = errorMessage.indexOf("near");
                const nearClause = errorMessage.substring(nearIndex);
                detailedMessage = `SQL Error: ${errorMessage.split("near")[0]} ${nearClause}`;
            }

            document.getElementById("results").innerHTML = `<p style="color: red;">${detailedMessage}</p>`;
            console.error("SQL Error:", error);
        }
    });

    function displayResults(results) {
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (results.length === 0) {
            resultsDiv.innerHTML = "<p>No results.</p>";
            return;
        }

        const table = document.createElement("table");
        const headerRow = document.createElement("tr");
        results[0].columns.forEach(column => {
            const th = document.createElement("th");
            th.textContent = column;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        results[0].values.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(value => {
                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        resultsDiv.appendChild(table);
    }
}

main();

document.getElementById("closeDialog").addEventListener("click", () => {
    document.getElementById("warningDialog").close();
});