import React, { useRef } from 'react';

interface Props {
  sequence: number[];
  directions: Array<1 | -1 | 0>;
  onAdd: (val: number) => void;
  onRandom: () => void;
  onAuto: (n: number) => void;
  onReset: () => void;
}

const InputPanel: React.FC<Props> = ({
  sequence,
  directions,
  onAdd,
  onRandom,
  onAuto,
  onReset,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const val = parseFloat(inputRef.current?.value ?? '');
    if (isNaN(val)) return;
    if (inputRef.current) inputRef.current.value = '';
    onAdd(val);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="panel">
      <div className="panel__title">sequence input</div>

      <div className="input-row">
        <input
          ref={inputRef}
          type="number"
          className="input-number"
          placeholder="number"
          step="any"
          onKeyDown={handleKey}
        />
        <button className="btn" onClick={handleAdd}>ADD</button>
        <button className="btn btn--secondary" onClick={onRandom}>RAND</button>
        <button className="btn btn--secondary" onClick={() => onAuto(20)}>AUTO×20</button>
        <button className="btn btn--secondary" onClick={() => onAuto(100)}>AUTO×100</button>
        <button className="btn btn--secondary" onClick={onReset}>RESET</button>
      </div>

      <div className="sequence-scroll">
        {sequence.length === 0 ? (
          <span className="placeholder">enter numbers...</span>
        ) : (
          sequence.map((val, i) => {
            const dir = i > 0 ? directions[i - 1] : null;
            return (
              <div className="seq-item" key={i}>
                {dir !== null && (
                  <span className={`seq-arrow ${dir > 0 ? 'up' : 'down'}`}>
                    {dir > 0 ? '↑' : '↓'}
                  </span>
                )}
                <span className="seq-num">{val}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="hint">Enter — add | AUTO — autotest on random numbers</div>
    </div>
  );
};

export default InputPanel;