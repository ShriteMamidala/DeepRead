console.log("JS loaded and running");


// ---------- Page Functions ---------- //

function homePage() {
  return `
    <div class="app-container home">
      <h1 class="home-title">Welcome to DeepRead</h1>
      <p class="home-description">
        A powerful tool to detect and improve biased text instantly.
      </p>
      <div class="button-grid">
        <button class="home-btn-grid" onclick="navigate('/detector')">Bias Detector</button>
        <button class="home-btn-grid" onclick="navigate('/instructions')">Instructions</button>
        <button class="home-btn-grid" onclick="navigate('/game')">Beat the Bias</button>
        <button class="home-btn-grid" onclick="navigate('/credits')">Credits</button>
      </div>
    </div>`;
}

function biasDetectorPage() {
  return `
    <div class="app-container">
      <button class="home-btn" onclick="navigate('/')">Home</button>

      <div class="filters-wrapper">
        <button class="filters-btn" onclick="toggleFilters()">Filters</button>
        <div class="filters-dropdown" id="filters-dropdown">
          ${["Gender", "Political", "Race"]
            .map(
              (filter) =>
                `<div class="filter-option" onclick="toggleActive(this)">${filter}</div>`
            )
            .join("")}
        </div>
      </div>

      
      <div class="content-scroll">
        <div class="content-wrapper">
          <h1 class="title">DeepRead</h1>

          <div class="layout-row">
            <div class="side-panel">
              <h2 class="panel-title">Bias Distribution</h2>
              <div class="panel-box" id="visualization-panel">
                <div class="chart-container">
                  <canvas id="gender-chart"></canvas>
                  <p class="chart-label">Gender Bias</p>
                </div>
                <div class="chart-container">
                  <canvas id="political-chart"></canvas>
                  <p class="chart-label">Political Bias</p>
                </div>
                <div class="chart-container">
                  <canvas id="race-chart"></canvas>
                  <p class="chart-label">Race Bias</p>
                </div>
              </div>
            </div>

            <div class="center-column">
              <div class="text-area-wrapper">
                <div class="highlight-layer" id="highlight-layer"></div>
                <textarea class="text-area" id="input-text" placeholder="Paste or type text here for bias detection..." oninput="syncScroll()" onscroll="syncScroll()"></textarea>
              </div>

              <div class="action-row">
                <label for="file-upload" class="icon-btn" title="Upload File">📁</label>
                <input type="file" id="file-upload" class="hidden-file-input" />
                <button class="detect-btn" onclick="analyzeText()">Detect Bias</button>
              </div>

              <h2 class="subtitle">Summary & Analysis</h2>
              <textarea class="text-area" placeholder="This area will show the bias summary and suggested rewrite..."></textarea>
            </div>

            <div class="side-panel">
              <h2 class="panel-title">Bias Intensity</h2>
              <div class="panel-box">
                <div class="intensity-bar-wrapper">
                  <div class="intensity-bar" id="intensity-bar"></div>
                </div>
                <div class="intensity-label" id="intensity-label">0%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}
function instructionsPage() {
  return `
    <div class="app-container instructions">
      <button class="home-btn" onclick="navigate('/')">Home</button>

      <h1 class="instructions-title">Instructions</h1>

      <p class="instructions-text">
        DeepRead helps you identify bias in text and improve clarity and fairness in communication.
        Below are guides for using our main tools.
      </p>

      <h2 class="section-subtitle">Bias Detection</h2>
      <p class="instructions-text">
        Use the Bias Detector to upload or paste text. The app will analyze it and highlight biased language based on the selected filters (Gender, Political, Racial, etc.).
        You’ll also see a suggested rewrite and bias intensity.
      </p>

      <h2 class="section-subtitle">Beat the Bias Game</h2>
      <p class="instructions-text">
        In Beat the Bias, you’ll be given text samples. Your goal is to identify and rewrite the biased portions as quickly and accurately as possible.
        It's a fun way to practice spotting bias in real-world writing!
      </p>
    </div>`;
}

function creditsPage() {
  return `
    <div class="app-container credits">
      <button class="home-btn" onclick="navigate('/')">Home</button>
      <h1 class="instructions-title">Credits</h1>

      <div class="credits-names">
        <div class="credit-column">
          <h2 class="credit-name">Vandan Ayyalapu</h2>
          <h3 class="credit-role">Frontend</h3>
        </div>
        <div class="credit-column">
          <h2 class="credit-name">Shritej Mammidala</h2>
          <h3 class="credit-role">Backend</h3>
        </div>
      </div>

      <p class="instructions-text">
        DeepRead was created during a Hackathon to help detect and fix biased text.
      </p>
    </div>`;
}

// ---------- Page Map ---------- //

const pages = {
  "/": homePage,
  "/detector": biasDetectorPage,
  "/instructions": instructionsPage,
  "/credits": creditsPage,
  "/game": gamePage,
};

// ---------- Routing ---------- //

function renderPage(path) {
  const root = document.getElementById('root');
  root.classList.remove('fade-out');

  const safePath = pages[path] ? path : "/";
  console.log("Rendering:", safePath);

  setTimeout(() => {
    root.innerHTML = pages[safePath]();
  }, 200);
}

function navigate(path) {
  const root = document.getElementById('root');
  root.classList.add('fade-out');
  setTimeout(() => {
    if (location.protocol !== "file:") {
      history.pushState({}, "", path);
    }
    renderPage(path);
  }, 300);
}

// ---------- Analyze Text & Highlight ---------- //

function analyzeText() {
  const input = document.getElementById("input-text");
  const highlightLayer = document.getElementById("highlight-layer");
  const output = document.querySelector('.text-area[placeholder*="summary"]'); // ✅ Targets summary box safely
  const inputText = input.value;

  fetch("/detect-bias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: inputText }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Bias data:", data);

      if (!data || !data.highlighted) {
        console.warn("No highlighted data returned:", data);
        return;
      }

      // Highlight overlay with original text + bias highlights
      highlightLayer.innerHTML = data.highlighted.replace(/\n/g, "<br>");

      // Bias intensity bar
      const biasedSentences = data.biased_sentences || 0;
      const totalSentences = data.total_sentences || 1;
      const percentage = Math.round((biasedSentences / totalSentences) * 100);

      const bar = document.getElementById("intensity-bar");
      const label = document.getElementById("intensity-label");

      if (bar && label) {
        bar.style.height = `${percentage}%`;
        label.textContent = `${percentage}%`;
      }

      // Pie charts
      const ctxGender = document.getElementById('gender-chart').getContext('2d');
      const ctxPolitical = document.getElementById('political-chart').getContext('2d');
      const ctxRace = document.getElementById('race-chart').getContext('2d');

      new Chart(ctxGender, {
        type: 'pie',
        data: {
          labels: ['Bias', 'Neutral'],
          datasets: [{ data: [data.scores.gender, 1 - data.scores.gender] }]
        }
      });

      new Chart(ctxPolitical, {
        type: 'pie',
        data: {
          labels: ['Bias', 'Neutral'],
          datasets: [{ data: [data.scores.political_lnr, 1 - data.scores.political_lnr] }]
        }
      });

      new Chart(ctxRace, {
        type: 'pie',
        data: {
          labels: ['Bias', 'Neutral'],
          datasets: [{ data: [data.scores.race, 1 - data.scores.race] }]
        }
      });

      // Summary + rewrites (in bottom textarea only)
      const summary = `${data.summary}

Bias Scores:
- Gender Bias: ${data.scores.gender}
- Political (LNR) Bias: ${data.scores.political_lnr}
- Race Bias: ${data.scores.race}`;

      const rewriteSection = data.rewrites || "(No rewrites generated)";
      const fullSummary = `${summary}

-------------------------
✍️ Suggested Rewrites:
-------------------------

${rewriteSection}`;

      if (output) {
        output.value = fullSummary;
      }

      // Tooltip setup
      setTimeout(() => {
        const marks = document.querySelectorAll('mark[title]');
        marks.forEach(mark => {
          tippy(mark, {
            content: mark.getAttribute('title'),
            allowHTML: true,
            theme: 'light',
            placement: 'top',
            arrow: true,
            interactive: true,
            appendTo: document.body,
            onShow(instance) {
              instance.reference.removeAttribute('title');
            },
            onHidden(instance) {
              instance.reference.setAttribute('title', instance.props.content);
            }
          });
        });
      }, 100);

      // Lock user input textarea
      input.disabled = true;
      input.style.color = "transparent";
      input.style.caretColor = "transparent";
      input.style.pointerEvents = "none";
    })
    .catch((err) => {
      console.error("Failed to call backend:", err);
      if (output) output.value = "Error detecting bias.";
    });
}



// ---------- Scroll Sync ---------- //

function syncScroll() {
  const input = document.getElementById("input-text");
  const highlight = document.getElementById("highlight-layer");
  highlight.scrollTop = input.scrollTop;
  highlight.scrollLeft = input.scrollLeft;
}

// ---------- Filters ---------- //

function toggleFilters() {
  const dropdown = document.getElementById('filters-dropdown');
  dropdown.classList.toggle('show');
}

function toggleActive(el) {
  document.querySelectorAll('.filter-option').forEach((opt) => {
    opt.classList.remove('active', 'faded');
  });
  el.classList.add('active');
}

// ---------- History & Init ---------- //

window.addEventListener("popstate", () => renderPage(location.pathname));
window.addEventListener("DOMContentLoaded", () => renderPage(location.pathname));

document.addEventListener("change", (e) => {
  if (e.target.id === "file-upload") {
    const file = e.target.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = function (event) {
        const textArea = document.getElementById("input-text");
        textArea.value = event.target.result;
        textArea.disabled = false;
        textArea.style.color = "white";
        textArea.style.caretColor = "auto";
        textArea.style.pointerEvents = "auto";
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a plain text (.txt) file.");
    }
  }
});

const biasGameData = [
  {
    biased: "She throws like a girl.",
    unbiased: "She throws the ball with her own unique style.",
  },
  {
    biased: "The chairman opened the meeting.",
    unbiased: "The chairperson opened the meeting.",
  },
  {
    biased: "The elderly struggle with new technology.",
    unbiased: "Some people find new technology challenging, regardless of age.",
  },
  {
    biased: "He manned the front desk.",
    unbiased: "He staffed the front desk.",
  }
];

let currentGameIndex = 0;

function gamePage() {
  return `
    <div class="app-container game">
      <button class="home-btn" onclick="navigate('/')">Home</button>
      <h1 class="instructions-title">Beat the Bias</h1>

      <div class="game-box">
        <p class="biased-sentence" id="biased-sentence">
          ${biasGameData[currentGameIndex].biased}
        </p>

        <textarea class="text-area" id="user-rewrite" placeholder="Rewrite the sentence to remove bias..."></textarea>

        <button class="upload-btn" onclick="submitRewrite()">Submit Rewrite</button>

        <div class="feedback-box" id="feedback-box"></div>

        <button class="upload-btn" onclick="loadNewSentence()">Next</button>
      </div>
    </div>`;
}

function loadNewSentence() {
  currentGameIndex = (currentGameIndex + 1) % biasGameData.length;
  const sentenceEl = document.getElementById("biased-sentence");
  const textarea = document.getElementById("user-rewrite");
  const feedbackBox = document.getElementById("feedback-box");

  if (sentenceEl && textarea && feedbackBox) {
    sentenceEl.innerText = biasGameData[currentGameIndex].biased;
    textarea.value = "";
    feedbackBox.innerHTML = "";
  }
}

function submitRewrite() {
  const userText = document.getElementById("user-rewrite").value.trim();
  const idealText = biasGameData[currentGameIndex].unbiased;
  const feedbackBox = document.getElementById("feedback-box");

  if (!userText) {
    feedbackBox.innerHTML = `<p class="feedback-error">Please write a rewritten sentence before submitting.</p>`;
    return;
  }

  const similarity = getSimilarity(userText, idealText);
  let feedback = "";

  if (similarity > 0.8) {
    feedback = `<p class="feedback-success">Great job! Your rewrite is quite close to an unbiased version.</p>`;
  } else if (similarity > 0.5) {
    feedback = `<p class="feedback-warning">Not bad! There's still room for improvement.</p>`;
  } else {
    feedback = `<p class="feedback-error">Hmm, that still feels biased. Here's a better version:</p>
                <p class="ideal-text">${idealText}</p>`;
  }

  feedbackBox.innerHTML = feedback;
}

function getSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const commonWords = [...wordsA].filter(word => wordsB.has(word));
  return commonWords.length / Math.max(wordsA.size, wordsB.size);
}
