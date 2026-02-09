const log = (t) => (document.getElementById("log").innerText = t);

function speak(text) {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

async function run(text) {
  log("you: " + text);
  const out = await window.api.sendCommand(text);
  log("aria: " + out.say);
  speak(out.say);
}

document.getElementById("send").onclick = () => {
  const t = document.getElementById("cmd").value.trim();
  if (t) run(t);
};

document.getElementById("voice").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return speak("speech recognition not supported.");
  const r = new SR();
  r.onresult = (e) => run(e.results[0][0].transcript);
  r.start();
  speak("listening.");
};
