/*
This html should be included in the question page of moodle. 

<div>
<p>Enunciado del ejercicio:</p>
<iframe id="checker" src="" width="100%" height="800" hidden></iframe>
<script>const checker_parameter = "ZXJkaWFncmFtJTIwTW9kZWwlMEFub3RhdGlvbiUzRGNyb3dzZm9vdCUwQSUwQS8vJTIwRW50aWRhZGVzJTBBZW50aXR5JTIwU3VwZXJoZXJvZSUyMCU3QiUwQSUyMCUyMCUyMCUyMG5vbWJyZVN1cGVyaGVyb2UlMjBrZXklMjAlMjAlMEElMjAlMjAlMjAlMjBmZWNoYSUwQSU3RCUwQSUwQWVudGl0eSUyMFBsYW5ldGElMjAlN0IlMEElMjAlMjAlMjAlMjBjb2RfcGxhbmV0YSUyMGtleSUyMCUyMCUwQSUyMCUyMCUyMCUyMG5vbWJyZVBsYW5ldGElMEElMjAlMjAlMjAlMjBzaXN0ZW1hX3BsYW5ldGFyaW8lMEElMjAlMjAlMjAlMjBjb29yZGVuYWRhcyUwQSU3RCUwQSUwQWVudGl0eSUyMFN1cGVycG9kZXIlMjAlN0IlMEElMjAlMjAlMjAlMjBjb2Rfc3VwZXJwb2RlciUyMGtleSUyMCUyMCUwQSUyMCUyMCUyMCUyMGRlc2NyaXBjaW9uJTBBJTdEJTBBJTBBZW50aXR5JTIwVGlwb01pc2lvbiUyMCU3QiUwQSUyMCUyMCUyMCUyMGNvZF9taXNpb24lMjBrZXklMjAlMjAlMEElMjAlMjAlMjAlMjBkZXNjcmlwY2lvbiUwQSUyMCUyMCUyMCUyMGdyYWRvX2RpZmljdWx0YWQlMEElN0QlMEElMEEvLyUyMFJlbGFjaW9uZXMlMEFyZWxhdGlvbnNoaXAlMjBjb29yZGluYSUyMCU3QiUwQSUyMCUyMCUyMCUyMFN1cGVyaGVyb2UlNUIxLi4xJTVEJTIwLSUzRSUyMFBsYW5ldGElNUIwLi4xJTVEJTIwJTBBJTIwJTIwJTIwJTIwZmVjaGFfaW5pY2lvJTBBJTdEJTBBJTBBLy8lMjBSZWxhY2lvbmVzJTBBcmVsYXRpb25zaGlwJTIwcHJvY2VkZSUyMCU3QiUwQSUyMCUyMCUyMCUyMFN1cGVyaGVyb2UlNUIxLi5OJTVEJTIwLSUzRSUyMFBsYW5ldGElNUIwLi4xJTVEJTBBJTdEJTBBJTBBcmVsYXRpb25zaGlwJTIwcG9zZWUlMjAlN0IlMEElMjAlMjAlMjAlMjBTdXBlcmhlcm9lJTVCMC4uTiU1RCUyMC0lM0UlMjBTdXBlcnBvZGVyJTVCMS4uTiU1RCUyMCUyMCUwQSUyMCUyMCUyMCUyMG5pdmVsJTBBJTdEJTBBJTBBcmVsYXRpb25zaGlwJTIwcmVzcG9uc2FibGVEZSUyMCU3QiUwQSUyMCUyMCUyMCUyMFN1cGVyaGVyb2UlNUIwLi4xJTIwJTdDJTIwJTIyU3VwZXJpb3IlMjIlMjAlNUQlMjAtJTNFJTIwU3VwZXJoZXJvZSU1QjAuLk4lMjAlN0MlMjAlMjJTdWJvcmRpbmFkbyUyMiU1RCUyMCUwQSU3RCUwQSUwQXdlYWslMjBlbnRpdHklMjBNaXNpb25SZWFsaXphZGElMjAlN0IlMEElMjAlMjAlMjAlMjBmZWNoYV9yZWFsaXphY2lvbiUyMHBhcnRpYWwta2V5JTBBJTdEJTBBJTBBd2VhayUyMHJlbGF0aW9uc2hpcCUyMGhhUmVhbGl6YWRvJTIwJTdCJTBBJTIwJTIwJTIwJTIwTWlzaW9uUmVhbGl6YWRhJTVCMC4uTiU1RCUyMC0lM0UlMjBTdXBlcmhlcm9lJTVCMS4uMSU1RCUyMCUyMCUyMCUyMCUyMCUwQSU3RCUwQSUwQXdlYWslMjByZWxhdGlvbnNoaXAlMjBjYXRlZ29yaXphZGFDb21vJTIwJTdCJTBBJTIwJTIwJTIwJTIwTWlzaW9uUmVhbGl6YWRhJTVCMC4uTiU1RCUyMC0lM0UlMjBUaXBvTWlzaW9uJTVCMS4uMSU1RCUyMCUwQSU3RCUwQQ==";</script>
<script src="https://i3lab.unex.es/sql-snippets/erd-checker.js">
</script>
</div>

*/


const iframe = document.getElementById('checker');

//Get the message from iframe document
window.addEventListener('message', function (event) {
    // Very important: check the origin of the message in production!
    if (event.origin !== 'https://i3lab.unex.es') return;

    if (event.source === iframe.contentWindow) {
        console.log('Parent received message:', event.data);

        if (event.data.type === 'md5') { // md5 received
            //set the value of the answer input
            const sql_answer = this.document.getElementById('id_answer');
            if (sql_answer) {
                sql_answer.hidden = true;
                sql_answer.value = event.data.hash;;
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
        else if (event.data.type === 'ping') { // reply to ping from iframe
            console.log('Sending message to iframe to show submit button');
            iframe.contentWindow.postMessage('false', '*');
        }
    }
});


document.addEventListener('DOMContentLoaded', function () {
    showAndHideSnippets();
});

//Load and show the iframe only when question page (not response page)
function showAndHideSnippets() {
    console.log("Running showAndhide function");
    const ok_flag = document.getElementById('id_answer');
    console.log("flag value: ", ok_flag);
    if (ok_flag) { //on question page
        const checker_frame = document.getElementById('checker');
        checker_frame.src = "https://i3lab.unex.es/sql-snippets/erd-checker.html?s="+checker_parameter;
        checker_frame.hidden = false;

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
    else { //WARNING: not only response page
        //removing MD5 response in response page
        changeDivContentByMD5('text_to_html', '');
        console.log('removing response')
    }
}

function changeDivContentByMD5(className, newInnerHTML) {
    let divElements = document.querySelectorAll('.' + className);
    const md5Regex = /^[a-f0-9]{32}$/; // Regular expression for MD5 hash
  
    for (let i = 0; i < divElements.length; i++) {
      if (md5Regex.test(divElements[i].innerHTML)) {
        divElements[i].innerHTML = newInnerHTML;
        return; // Stop after finding and updating the first matching div
      }
    }
    console.log("Div with response not found.");
  }

