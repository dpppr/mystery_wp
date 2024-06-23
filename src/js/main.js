

const characters = [
	{
		id: "remi",
		fullname: "Remi, the chef",
		image: "chef.png",
		x: 5,
		y: 65,
	},
	{
		id: "iris",
		fullname: "Iris, the maid",
		image: "maid.png",
		x: 20,
		y: 65,
	},
	{
		id: "evelyn",
		fullname: "Evelyn, the doctor",
		image: "doctor.png",
		x: 35,
		y: 65,
	},
	{
		id: "cordelia",
		fullname: "Cordelia Darkwood, the Lady of Darkwood Manor",
		image: "lady.png",
		x: 60,
		y: 65,
	},
	{
		id: "lucien",
		fullname: "Lucien Darkwood, the Lord of Darkwood Manor",
		image: "lord.png",
		x: 80,
		y: 65,
	},
];

const hints = [
	'Do you know what weapon was used?',
	'Do you know who the letter was to and from?',
	'Who has access to the weapon?',
	'Why do you think the brandy was stolen?',
	'Did Alfred have any secrets?',
	'Did anyone plan to use the letter for anything?',
	'Why was it an expensive bottle of brandy that went missing?',
	'Could alfred have accrued debts?',
	'Why would alfred want to show off the letter to Lord Darkwood?'

]
let hintIndex = 0;

$(document).ready(function () {
	init();
});

function init() {
	// Add character image and chatbox for each character
	for (let characterData of characters) {
		addChatBox(characterData.id, characterData.fullname);
		addCharacterDOM(characterData);
	}
    // Add a chatbox for solving
    addChatBox('solve','Can you solve the mystery?','Solve');
	initListeners();
}

function initListeners() {
	$("#continue-button").on("click", closeModal);
	$(".chat-closeButton").on("click", closeChat);
    $("#solve-button").on("click", function(){openChat('solve')});
	$("#intro-button").on("click", showIntro);
	$("#hint-button").on("click", showHint);
	$('input').on('keyup', function (e) {
		if (e.key === 'Enter' || e.keyCode === 13) {
			$(this).parent().find('.question-button').click();
		}
	});
}

function closeModal() {
	$("#modal").removeClass('isOpen').addClass('isClosed');
}


function addCharacterDOM(characterData) {
	let characterHtml = `
    <div class="character-container" style="left:${characterData.x}%; top:${characterData.y}%;">
        <div class="character" data-name="${characterData.id}" style="background-image:url('./assets/${characterData.image}')" onclick="openChat('${characterData.id}')"></div>
    </div>
    `;
	$("#main-container").append(characterHtml);
}

function addChatBox(id, fullname, buttonText='Ask') {
	let chatBoxHtml = `
    <div class="chatbox" id="${id}-chatbox">
    <div class="chat-topbar">
    <span>${fullname}</span><div class="chat-closeButton">&#10006;</div>
    </div>
    <hr/>
        <div class="chat">
		</div>
        <input class="question-input"></input>
        <button class="question-button button" onclick="submitQuestion('${id}')">${buttonText}</button>
    </div>
    `;
	$("#main-container").append(chatBoxHtml);
}

function generateChatPlaceHolder() {
	let htmlStr = `
	<div class="response-container">
        <span class="response dialogue chat-placeholder">
            <div class="chat-dot">•</div>
            <div class="chat-dot">•</div>
            <div class="chat-dot">•</div>
        </span>
	</div>
`;
	return htmlStr;
}

function showHint(){
	$('#hint-text').text(hints[hintIndex]);
	hintIndex = hintIndex < hints.length-1 ? hintIndex+1: 0;

}

function showIntro(){
	$('#modal').addClass('isOpen').removeClass('isClosed');
}

function openChat(responderId) {
	$(".chatbox.isOpen").removeClass("isOpen").addClass('isClosed');
	$(`#${responderId}-chatbox`).removeClass("isClosed").addClass("isOpen");
	$(`#${responderId}-chatbox`).find('input').focus();
}

function closeChat() {
	$(this).parents(".chatbox").removeClass("isOpen").addClass("isClosed");
}

function submitQuestion(responderId) {
	let chatBox = $(`#${responderId}-chatbox`);
	let inputElem = chatBox.find("input");
	let historyElem = chatBox.find(".chat");
	let inputVal = inputElem.length ? inputElem.val().trim() : "";

	if (!inputVal || !inputVal.length) {
		return;
	}
	// Add users message and placeholder response to chat window
	addChatText(null, "user", historyElem, inputVal);
	let chatPlaceholder = generateChatPlaceHolder();
	historyElem.append(chatPlaceholder);
	//scroll to placeholder
	let textOffset = historyElem.find(".chat-placeholder").last().offset();
	if (textOffset) {
		historyElem.scrollTop(textOffset.top, 200);
	}

	sendQuestionToTwilio(responderId, inputVal, historyElem);
	inputElem.val("");
}

function sendQuestionToTwilio(responderId, inputVal, historyElem) {
	const xhr = new XMLHttpRequest();
	xhr.open("POST", "https://gemini-9863.twil.io/genText");
	xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
	const body = JSON.stringify({
		character: responderId,
		question: inputVal,
	});
	xhr.onerror = () => {
		onXHRFail(responderId, historyElem);
	};
	xhr.onload = () => {
		if (xhr.readyState == 4 && xhr.status == 200) {
            if (responderId == 'solve'){
                checkAnswerCorrect(xhr.responseText);
            }
			addChatText(responderId, "response", historyElem, xhr.responseText);
		} else {
			console.log(`Error: ${xhr.status}`);
			onXHRFail(responderId, historyElem);
		}
	};
	xhr.send(body);
}

function onXHRFail(responderId, historyElem) {
    if (responderId == 'solve'){
        addChatText(
            responderId,
            "error",
            historyElem,
            `Hmm, that didn't quite work - try rewording your theory.`
        ); 
        return;
    }
	addChatText(
		responderId,
		"error",
		historyElem,
		`${capitalizeFirstLetter(
			responderId
		)} stares at you blankly. Try rewording your question.`
	);
}

function addChatText(responderId, responseClass, historyElem, text) {
	const cleanedText = text.trim().replace(/\n|\r/g, "").replaceAll(`"`, "").replaceAll('#correct#','').replaceAll('#incorrect#','')

	const chatTextHtml = `<div class="dialogue-container"><span class="${responseClass} dialogue">${cleanedText}</span></div>`;
	historyElem.find(".chat-placeholder").parent().remove();
	historyElem.append(chatTextHtml);
	//scroll to new text
	let textOffset = historyElem.find(".dialogue-container").last().offset();
	if (textOffset) {
		historyElem.scrollTop(textOffset.top, 200);
	}
	if (responderId && responseClass == "response") {
		$(`.character[data-name=${responderId}]`).addClass("is-talking");
		window.setTimeout(function () {
			$(`.character[data-name=${responderId}]`).removeClass("is-talking");
		}, 2800);
	}
}

function checkAnswerCorrect(text){
    if (text.includes('#correct#')){
        const htmlStr = `
        <h3>Congratulations!</h3>
        <div id="bottle"></div>
        <p>Dark secrets and deadly passions collided at Darkwood Manor. Lady Cordelia's forbidden affair with the butler, Alfred, turned violent when his blackmail ignited a fiery rage. In a desperate struggle, a stolen, prized brandy bottle shattered against Alfred's head, silencing his threats forever. The love letters fueling the flames of betrayal vanished into a cloud of ash, leaving only death and deceit in their wake.
        <br/><br/>
        Well done, you have solved the Mystery!
        </p>
        `
        $('#modal-dialog').html(htmlStr);
        $('#modal').addClass('isOpen').removeClass('isClosed');
    }
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
