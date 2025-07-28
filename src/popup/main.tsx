import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 创建 React 应用根节点
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);