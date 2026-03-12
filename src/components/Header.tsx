import React from 'react';
import { ALL_PROGRAMS } from '../logic/programs2';

const Header: React.FC = () => (
  <header className="header">
    <h1 className="header__title">SOLOMONOFF v2</h1>
    <span className="header__subtitle">binary direction predictor</span>
    <span className="header__count">{ALL_PROGRAMS.length} программ</span>
  </header>
);

export default Header;