import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Alert, Snackbar } from '@mui/material';
import { useUIStore } from '../stores/uiStore';
import { useAppStore, useIsInitialized, useAppError } from '../stores/appStore';
import HomePage from './pages/HomePage';
import ReviewPage from './pages/ReviewPage';
import SettingsPage from './pages/SettingsPage';
import WordListPage from './pages/WordListPage';
import Navigation from './components/Navigation';
import LoadingOverlay from './components/LoadingOverlay';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// 创建 MUI 主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  const { currentPage, isLoading } = useUIStore();
  const { initializeApp, clearError } = useAppStore();
  const isInitialized = useIsInitialized();
  const error = useAppError();

  // 初始化应用
  useEffect(() => {
    if (!isInitialized) {
      initializeApp();
    }
  }, [isInitialized, initializeApp]);

  const renderCurrentPage = () => {
    if (!isInitialized) {
      return null; // 显示加载状态
    }

    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'review':
        return <ReviewPage />;
      case 'settings':
        return <SettingsPage />;
      case 'wordList':
        return <WordListPage />;
      default:
        return <HomePage />;
    }
  };

  const handleCloseError = () => {
    clearError();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            bgcolor: 'background.default',
          }}
        >
          <Navigation />
          <Box 
            sx={{ 
              flex: 1, 
              overflow: 'auto',
              p: 1,
            }}
          >
            {renderCurrentPage()}
          </Box>
          
          {/* 加载状态覆盖层 */}
          {(isLoading || !isInitialized) && <LoadingOverlay />}
          
          {/* 错误提示 */}
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={handleCloseError}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleCloseError} 
              severity="error" 
              sx={{ width: '100%' }}
            >
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;