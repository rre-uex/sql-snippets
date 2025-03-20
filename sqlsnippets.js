const iframe = document.getElementById('snippets');

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

