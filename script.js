async function myInitSqlJs(dbFile) {
    let db;
    try {
        const response = await fetch(dbFile); // Use selected dbFile
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/${file}`
        });
        try {
            db = new SQL.Database(new Uint8Array(buffer));
        } catch (sqlError) {
            // Catch sql.js specific errors, including "file is not a database"
            console.error("sql.js error:", sqlError);
            throw new Error("Error loading database: " + sqlError.message);
        }
    } catch (remoteError) {
        console.warn("Failed to load remote database:", remoteError);
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/${file}`
        });
        db = new SQL.Database();
        db.run("CREATE TABLE students (id INTEGER primary key, name TEXT, grade INTEGER, country integer not null, foreign key (country) references countries(id));");
        db.run("CREATE TABLE countries (id INTEGER primary key, name TEXT);");
        db.run("INSERT INTO countries VALUES (1, 'USA'), (2, 'UK'), (3, 'Italy');");
        db.run("INSERT INTO students VALUES (1, 'Alice', 90, 1), (2, 'Bob', 85, 2), (3, 'Charlie', 95, 3);");        

        // Show warning dialog using alert()
        const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table';")[0].values.map(row => row[0]);
        const tableList = tableNames.join(', ');
        const dialogMessage = `Failed to load remote database. An example database has been created with tables: ${tableList}`;
        document.getElementById("dialogMessage").textContent = dialogMessage;
    //    document.getElementById("warningDialog").showModal();

        //Display tables in the results div
        //const tableListHTML = tableNames.map(name => `<li>${name}</li>`).join('');
        //document.getElementById("results").innerHTML = `<ul>${tableListHTML}</ul>`;


    }

    return db;
}


async function main() {
   
    //Get the message from iframe document
    window.addEventListener('message', function (event) {
        console.log('Message received: ', event.data);
        // Very important: check the origin of the message in production!
        if (event.origin !== 'https://campusvirtual.unex.es') return;

        if (event.source === this.window.parent) {
            console.log('Parent received message:', event.data);

            const submitBt = document.getElementById("submitButton");
            submitBt.hidden = false;//event.data;
        }
    });

    //ping the window.parent in case loaded in a iframe    
    const message = { type: 'ping' };
    window.parent.postMessage(message, '*');

    // Add this near the beginning of the main function
    // Initialize collapsible sections
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            section.classList.toggle('collapsed');
        });
    });

    // Add cookie functions at the start of main
    const getCookie = name => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    };

    const setCookie = (name, value) => {
        const encodedValue = encodeURIComponent(value);
        document.cookie = `${name}=${encodedValue};path=/;max-age=2592000`; // 30 days
    };

    const urlParams = new URLSearchParams(window.location.search);
    const dbParam = urlParams.get('db');
    console.log("database:", dbParam);
    
    const submitButton = document.getElementById("submitButton");
    submitButton.disabled = true;

    const editor = CodeMirror.fromTextArea(document.getElementById("sqlEditor"), {
        mode: "text/x-sql",
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets: true,
        autofocus: true
    });

    // Load last query if exists
    const lastQuery = getCookie('lastQuery');
    if (lastQuery) {
        editor.setValue(lastQuery);
    }

    // dropdown list for selecting database
    const dbSelect = document.getElementById("dbSelect");
    
    // Set the selected database if specified in URL
    if (dbParam) {
        // This will work because we use includes() to find partial matches
        // For example: if dbParam is 'empresa' it will match 'db/empresa.db'
        const matchingOption = Array.from(dbSelect.options).find(option => 
            option.value.toLowerCase().includes(dbParam.toLowerCase())
        );
        if (matchingOption) {
            dbSelect.value = matchingOption.value;
        }
    }
    
    let db = await myInitSqlJs(dbSelect.value); // Initial load
    createSchemaMermaid(db);

    dbSelect.addEventListener("change", async () => {
        db = await myInitSqlJs(dbSelect.value); // Reload on change
        createSchemaMermaid(db);
    });

    document.getElementById("runButton").addEventListener("click", () => {
        const sql = editor.getValue();
        try {
            const results = db.exec(sql);
            displayResults(results);
            const submitButton = document.getElementById("submitButton");
            if (results.length > 0 && results[0].values.length > 0) {
                submitButton.disabled = false;
            } else {
                submitButton.disabled = true;
            }
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

    document.getElementById("closeDialog").addEventListener("click", () => {
        document.getElementById("warningDialog").close();
    });
    
    // Event listener for the Submit button
    document.getElementById("submitButton").addEventListener("click", () => {

        // Save current query to cookie
        const currentQuery = editor.getValue();
        setCookie('lastQuery', currentQuery);

        const resultsDiv = document.getElementById("results");
        if (resultsDiv.firstChild && resultsDiv.firstChild.tagName === 'TABLE') {
           
    
            const table = resultsDiv.querySelector('table');
            let tableString = "";
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('th, td');
                    cells.forEach(cell => {
                        tableString += cell.textContent + " ";
                    });
                    tableString += "\n";
                });
            }
            const hash = CryptoJS.MD5(tableString.trim()).toString(); // Calculate MD5 hash
            console.log("MD5 Hash of Results:", hash); // Log the hash
            console.log(tableString.trim()); // Log the hash
            const message = { type: 'md5', hash: hash };
            window.parent.postMessage(message, 'https://campusvirtual.unex.es'); //Send MD5 hash to parent window
        } else {
            console.log("No table results to submit.");
        }
    });

    document.getElementById('loading').style.display = 'none';
    document.querySelector('.main-content').style.display = 'block';
}

main().catch(error => {
    console.error('Error during initialization:', error);
    document.getElementById('loading').style.display = 'none';
    document.querySelector('.main-content').style.display = 'block';
});

