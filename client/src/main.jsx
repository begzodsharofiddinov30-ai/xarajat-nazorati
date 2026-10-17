import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CategoriesProvider } from './context/CategoriesContext.jsx';
import { MonthProvider } from './context/MonthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import '@fontsource-variable/inter';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {/* MonthProvider tashqarida: kategoriyalar o'zgarib daraxt qayta chizilganda tanlangan oy saqlanib qoladi. */}
            <MonthProvider>
              <CategoriesProvider>
                <App />
              </CategoriesProvider>
            </MonthProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
