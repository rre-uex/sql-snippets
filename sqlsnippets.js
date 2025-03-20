const iframe = document.getElementById('snippets');

//Get the message from iframe document
window.addEventListener('message', function (event) {
    // Very important: check the origin of the message in production!
    if (event.origin !== 'https://i3lab.unex.es') return;

    if (event.source === iframe.contentWindow) {
        console.log('Parent received message:', event.data);

        //set the value of the answer input
        const sql_answer = this.document.getElementById('id_answer');
        if (sql_answer) {
            sql_answer.hidden = true;
            sql_answer.value = event.data;
        }

        //submit answer        
        const sql_submitButton = document.getElementById('id_submitbutton');
        if (sql_submitButton) {
            sql_submitButton.hidden = true;
            sql_submitButton.click();
        } else {
            console.error("Submit button not found!");
        }
    }
});

//Load and show the iframe only when question page (not response page)
document.addEventListener('DOMContentLoaded', function () {
    // Your function code here
    showAndHideSnippets();
});

function showAndHideSnippets() {
    console.log("Running showAndhide function");
    const ok_flag = document.getElementById('id_answer');
    console.log("flag value: ", ok_flag);
    if (ok_flag) { //on question page
        const snippets_frame = document.getElementById('snippets');
        snippets_frame.src = "https://i3lab.unex.es/sql-snippets/index.html";
        snippets_frame.hidden = false;

        //set the value of the answer input
        const sql_answer = document.getElementById('id_answer');
        if (sql_answer) {
            sql_answer.hidden = true;
        }

        const sql_answer_label = document.getElementById('id_answer_label');
        if (sql_answer_label) {
            //     sql_answer_label.hidden = true;
            sql_answer_label.innerHTML = "";
        }

        //submit answer        
        const sql_submitButton = document.getElementById('id_submitbutton');
        if (sql_submitButton) {
            sql_submitButton.hidden = true;
        }
    }
}

