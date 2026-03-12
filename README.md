# SOLOMONOFF v2 — Binary Direction Predictor

![App Screenshot](screenshot.png)  
*Interactive dashboard for predicting the next direction (up/down) of a numeric sequence using an ensemble of expert programs and hierarchical context models.*

---

## Overview

SOLOMONOFF v2 is a web-based tool for real-time binary sequence prediction. It combines a large set of **expert programs** (hand-crafted strategies and pattern matchers) with a **Context Tree Weighting (CTW)** model to forecast whether the next value will go up or down. The interface provides live statistics, a detailed breakdown of expert performance, and a history log.

Built with React, TypeScript, Vite, and Node.js (optional backend), it demonstrates principles of online learning, ensemble methods, and Bayesian inference.

---

## Features

- **Dual Prediction Engines**  
  - **Expert Programs**: 500+ predefined strategies (mean reversion, trend following, volatility detection, pattern matching) that vote on the next direction.  
  - **CTW (Context Tree Weighting)**: A hierarchical Bayesian model that learns from contexts of depth 1–4 and outputs a probability for the next step.

- **Interactive Input**  
  - Manual entry of numbers (e.g., 40.1, 41.9, …) via an input field.  
  - `Enter` to add a value; `AUTO` button to generate a random test sequence.

- **Real‑time Statistics**  
  - **PREDICTIONS**: Overall prediction direction and confidence (e.g., 57%↑).  
  - **FAITHFUL**: Accuracy of the ensemble (percentage correct).  
  - **CTW ACCURACY**: Separate accuracy metric for the CTW model.  
  - **P(↑) RESULT**: Final probability of an upward move.

- **Expert Program Dashboard**  
  - Two views: **TOP-30** (best performing experts) and **PATTERNS** (all pattern‑based programs).  
  - Each program shows its name and current success rate (e.g., “mean reversion (5) 88%”).

- **CTW Details**  
  - Table displaying context depths 1–4 with counts of up/down observations and the resulting probability P(↑) for each context.

- **Prediction History**  
  - Scrollable log of recent steps, showing step number, previous value, and predicted direction (e.g., `+11 49.8 → 35.8`).

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, CSS Modules / CSS variables, Chart.js (if any charts are present).
- **Backend** (optional): Node.js + Express for persistent storage or heavy computation (can be omitted; all logic runs client‑side).
- **Key Libraries**:  
  - Custom math utilities (average, median, standard deviation).  
  - Expert program generators (manual and pattern).  
  - CTW implementation for context modelling.

---

## Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Clone the repository
```bash
git clone https://github.com/yourusername/solomonoff-v2.git
cd solomonoff-v2
Install dependencies and run the client
bash
cd client
npm install
npm run dev
Open http://localhost:5173 in your browser.

(Optional) Run the backend server
If you need server‑side features:

bash
cd server
npm install
npm start
The server will run on http://localhost:3001.
Note: The current version works fully offline without a backend.

Build for production
bash
cd client
npm run build
The output will be in the dist folder.

How to Use
Enter a sequence
Type a number into the input field and press Enter (or click the Enter - add button). The app will immediately display the new value in the sequence and update the prediction.

Auto‑test
Click AUTO to generate 10 random numbers (drawn from a plausible range) and observe how the predictions evolve.

Interpret the results

The main prediction (up/down arrow) is shown at the top of the statistics panel.

The PREDICTIONS percentage indicates the confidence of the ensemble.

The CTW ACCURACY reflects how well the context model has performed historically.

Explore expert programs
Scroll through the PROGRAMS list to see which strategies are currently most accurate. Each program’s success rate is updated after every step.

Drill into CTW
The CTW - HIERARCHICAL CONTEXT MODEL table shows, for each context depth (1–4), the counts of up/down observations and the resulting probability of an upward move. This reveals which contexts are most predictive.

Review history
The HISTORY OF PREDICTIONS log shows recent steps with their previous values and the direction predicted at that time.

How It Works
Expert Programs
Each program is a function that, given the history of numbers (or derived directions), returns a prediction: +1 (up), -1 (down), or 0 (abstain). Programs are divided into:

Manual programs – e.g., “mean reversion (5)”: if the last value is above the 5‑step average, predict down; otherwise predict up.

Pattern programs – For every binary sequence of length 2 to 7, two programs are generated: one that predicts up when the pattern matches, and one that predicts down.

The ensemble combines these predictions via a weighted vote. Weights are updated after each step using an exponential weighting scheme (Hedge algorithm), rewarding correct predictions and penalising mistakes.

CTW (Context Tree Weighting)
The CTW model maintains a tree of contexts (suffixes of the observed direction sequence). For each node it keeps counts of the next symbol. The prediction for a given context is a weighted average of the probabilities from all nodes along the path, using a Bayesian prior. This method automatically adapts to the relevant context length.

Customisation
You can adjust the behaviour by modifying parameters in the code:

Learning rate (η) – controls how quickly expert weights change (currently hard‑coded, but could be exposed as a slider).

Context depths – CTW supports depths up to 4 by default; you can increase it by editing the CTW initialisation.

Expert pool – Add or remove manual programs in src/programs/manual.ts.

Screenshots
https://screenshot.png
The main dashboard showing input, statistics, programs, CTW table, and history.

License
MIT License. See LICENSE for details.

Acknowledgements
Inspired by the work of Ray Solomonoff and the theory of algorithmic probability. The CTW algorithm is based on the seminal work by Willems, Shtarkov, and Tjalkens.

Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.