import { createContext } from 'react';

export interface AppContextProps {
  user: any;
  setUser: (u: any) => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
}

const AppContext = createContext<AppContextProps>({
  user: null,
  setUser: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
  isDarkMode: false,
  setIsDarkMode: () => {}
});

export default AppContext;