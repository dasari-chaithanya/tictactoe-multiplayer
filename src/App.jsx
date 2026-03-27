import React from 'react';
import Game from './pages/Game';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Game />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
