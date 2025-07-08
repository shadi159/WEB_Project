import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import '../app/globals.css';
import AppContext from '../app/AppContext';

// Create a client
const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider
        value={{
          user,
          setUser,
          isFullscreen,
          setIsFullscreen,
          isDarkMode,
          setIsDarkMode,
        }}
      >
        <Component {...pageProps} />
      </AppContext.Provider>
    </QueryClientProvider>
  );
}