// Passages grouped by difficulty
const passages = {
  easy: [
    "The quick brown fox jumps over the lazy dog.",
    "Practice makes perfect. Keep typing to get faster.",
    "Small steps every day lead to big changes over time.",
  ],
  medium: [
    "Typing speed improves with consistent practice and proper posture.",
    "Focus on accuracy first; speed naturally follows as you build muscle memory.",
    "Discipline is choosing what you want most over what you want now.",
  ],
  hard: [
    "In the face of ambiguity, refuse the temptation to guess; measure, iterate, and refine deliberately.",
    "Constraint breeds creativity: by limiting options, we sharpen decisions and accelerate progress.",
    "Courage is not the absence of fear, but the mastery of it through intentional action.",
  ],
};

const typingInput = document.getElementById("typingInput");
const textBox = document.getElementById("textBox");
const timeLeftEl = document.getElementById("timeLeft");
const durationEl = document.getElementById("duration");
const difficultyEl = document.getElementById("difficulty");
const endlessModeEl = document.getElementById("endlessMode");
const customDurationEl = document.getElementById("customDuration");

const newTextBtn = document.getElementById("newTextBtn");
const resetBtn = document.getElementById("resetBtn");
const themeToggle = document.getElementById("themeToggle");

const progressFill = document.getElementById("progressFill");
const charCountEl = document.getElementById("charCount");
const errorCountEl = document.getElementById("errorCount");

const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const charsStatEl = document.getElementById("charsStat");
const errorsStatEl = document.getElementById("errorsStat");

const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

let targetText = "";
let chars = [];
let currentIndex = 0;
let errors = 0;
let totalTypedChars = 0;
let started = false;
let finished = false;
let timerId = null;
let remaining = 30;
let startTimestamp = null;

// Pick random text
function pickText() {
  const diff = difficultyEl.value;
  const list = passages[diff];
  return list[Math.floor(Math.random() * list.length)];
}

// Render text
function renderText(text) {
  textBox.innerHTML = "";
  chars = [];

  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = text[i];
    textBox.appendChild(span);
    chars.push(span);
  }

  highlightCurrent();
  charCountEl.textContent = `0 / ${text.length} chars`;
  errorCountEl.textContent = `Errors: 0`;
  progressFill.style.width = "0%";
}

function highlightCurrent() {
  chars.forEach((c) => c.classList.remove("current"));
  if (chars[currentIndex]) chars[currentIndex].classList.add("current");
}

// Reset state
function resetState(newText = true) {
  clearInterval(timerId);
  timerId = null;
  started = false;
  finished = false;

  errors = 0;
  totalTypedChars = 0;
  currentIndex = 0;

  if (durationEl.value === "custom") {
    remaining = parseInt(customDurationEl.value || "30", 10);
  } else {
    remaining = parseInt(durationEl.value, 10);
  }

  timeLeftEl.textContent = remaining.toString();
  startTimestamp = null;

  typingInput.value = "";
  typingInput.disabled = false;

  if (newText) targetText = pickText();
  renderText(targetText);

  wpmEl.textContent = "0";
  accuracyEl.textContent = "100%";
  charsStatEl.textContent = "0";
  errorsStatEl.textContent = "0";
}

function startTimer() {
  if (timerId) return;

  startTimestamp = performance.now();

  timerId = setInterval(() => {
    remaining -= 1;
    timeLeftEl.textContent = remaining;

    if (remaining <= 0) endTest();
  }, 1000);
}

function endTest() {
  finished = true;
  typingInput.disabled = true;

  clearInterval(timerId);
  timerId = null;

  const elapsedMs = performance.now() - startTimestamp;
  const elapsedMinutes = elapsedMs / 1000 / 60;

  const grossWPM = Math.round((totalTypedChars / 5) / elapsedMinutes);
  const accuracy = totalTypedChars > 0
    ? Math.round(((totalTypedChars - errors) / totalTypedChars) * 100)
    : 100;

  wpmEl.textContent = grossWPM;
  accuracyEl.textContent = `${accuracy}%`;
  charsStatEl.textContent = totalTypedChars;
  errorsStatEl.textContent = errors;

  saveHistory({
    timestamp: new Date().toISOString(),
    wpm: grossWPM,
    accuracy,
    chars: totalTypedChars,
    errors,
    duration: remaining,
    difficulty: difficultyEl.value,
  });

  renderHistory();
}

function updateProgress() {
  const pct = Math.min(100, Math.round((currentIndex / targetText.length) * 100));
  progressFill.style.width = `${pct}%`;

  charCountEl.textContent = `${currentIndex} / ${targetText.length} chars`;
  errorCountEl.textContent = `Errors: ${errors}`;
}

function handleInput(e) {
  if (finished) return;

  const val = e.target.value;

  if (!started && val.length > 0) {
    started = true;
    startTimer();
  }

  // BACKSPACE
  if (val.length < currentIndex) {
    currentIndex = val.length;
    errors = 0;

    for (let i = 0; i < chars.length; i++) {
      chars[i].classList.remove("correct", "wrong");

      if (i < val.length) {
        if (val[i] === targetText[i]) chars[i].classList.add("correct");
        else {
          chars[i].classList.add("wrong");
          errors++;
        }
      }
    }

    highlightCurrent();
    updateProgress();
    return;
  }

  // NORMAL TYPING
  const typedChar = val[val.length - 1];
  const expectedChar = targetText[currentIndex];

  if (typedChar !== undefined) {
    if (typedChar === expectedChar) {
      chars[currentIndex].classList.add("correct");
    } else {
      chars[currentIndex].classList.add("wrong");
      errors++;
    }

    totalTypedChars++;
    currentIndex++;
  }

  highlightCurrent();
  updateProgress();

  // Endless mode: load next text instead of ending test
  if (currentIndex >= targetText.length) {
    if (endlessModeEl.checked) {
      targetText = pickText();
      renderText(targetText);
      typingInput.value = "";
      currentIndex = 0;
    } else {
      endTest();
    }
  }
}

// History functions
function saveHistory(entry) {
  const key = "typing_history_v1";
  const prev = JSON.parse(localStorage.getItem(key) || "[]");
  prev.unshift(entry);
  localStorage.setItem(key, JSON.stringify(prev.slice(0, 10)));
}

function renderHistory() {
  const key = "typing_history_v1";
  const data = JSON.parse(localStorage.getItem(key) || "[]");

  historyList.innerHTML = "";
  data.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${item.wpm}</strong> WPM • ${item.accuracy}% acc • ${item.chars} chars • ${item.errors} errors</span>
      <span>${item.duration}s • ${item.difficulty}</span>
    `;
    historyList.appendChild(li);
  });
}

// Theme toggle
themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("typing_theme", next);
});

// Load theme
(function initTheme() {
  const saved = localStorage.getItem("typing_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
})();

// Controls
durationEl.addEventListener("change", () => {
  customDurationEl.style.display = durationEl.value === "custom" ? "block" : "none";
  resetState(false);
});

customDurationEl.addEventListener("input", () => resetState(false));

newTextBtn.addEventListener("click", () => {
  resetState(true);
  typingInput.focus();
});

resetBtn.addEventListener("click", () => {
  resetState(false);
  typingInput.focus();
});

difficultyEl.addEventListener("change", () => resetState(true));

typingInput.addEventListener("input", handleInput);

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem("typing_history_v1");
  renderHistory();
});

// Init
(function init() {
  targetText = pickText();
  renderText(targetText);
  renderHistory();
  typingInput.focus();
})();
