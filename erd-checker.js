/*
 * Bloque que se incrusta en la pagina de la pregunta de Moodle.
 * Ver la documentacion interna para el bloque completo.
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

