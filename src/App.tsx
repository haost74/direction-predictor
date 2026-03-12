import { useCallback, useReducer, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './home.css';

import Header        from './components/Header';
import InputPanel    from './components/InputPanel';
import PredictionBox from './components/PredictionBox';
import Statistics    from './components/Statistics';
import HistoryLog    from './components/HistoryLog';
import Programs      from './components/Programs.js';
import CTWPanel      from './components/CTWPanel';

import { buildInitialState, processNumber } from './logic/predictor.js';
import type { AppState } from './types';
 
// ─── Reducer ─────────────────────────────────────────────────────────────────
 
type Action =
  | { type: 'ADD';   payload: number }
  | { type: 'LOAD';  payload: AppState }   // used for batch auto-run
  | { type: 'RESET' };
 
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD':
      return processNumber(state, action.payload);
    case 'LOAD':
      return action.payload;
    case 'RESET':
      return buildInitialState();
  }
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function randomNext(last: number): number {
  const raw = last + (Math.random() - 0.5) * 20;
  return Math.round(raw * 10) / 10;
}
 
// ─── Component ───────────────────────────────────────────────────────────────
 
const Home: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
 
  // Add single number
  const handleAdd = useCallback((val: number) => {
    dispatch({ type: 'ADD', payload: val });
  }, []);
 
  // One random step
  const handleRandom = useCallback(() => {
    const last = state.sequence.at(-1) ?? 50;
    dispatch({ type: 'ADD', payload: randomNext(last) });
  }, [state.sequence]);
 
  // N random steps — computed synchronously, then loaded in one dispatch
  const handleAuto = useCallback(
    (n: number) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const last = s.sequence.at(-1) ?? 50;
        s = processNumber(s, randomNext(last));
      }
      dispatch({ type: 'LOAD', payload: s });
    },
    [state],
  );
 
  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
 
  return (
    <div className="page-container">
      <Header />
 
      <div className="page-grid">
        {/* ── Left column ── */}
        <div className="left-col">
          <InputPanel
            sequence={state.sequence}
            directions={state.directions}
            onAdd={handleAdd}
            onRandom={handleRandom}
            onAuto={handleAuto}
            onReset={handleReset}
          />
 
          <PredictionBox prediction={state.pendingPrediction} />
 
          <Statistics
            stats={state.stats}
            accHistory={state.accHistory}
          />
 
          <HistoryLog logHistory={state.logHistory} />
        </div>
 
        {/* ── Right column ── */}
        <div className="right-col">
          <Programs
            sequence={state.sequence}
            directions={state.directions}
            progStats={state.progStats}
          />
 
          <CTWPanel ctxModel={state.ctxModel} />
        </div>
      </div>
    </div>
  );
};
 
export default Home;