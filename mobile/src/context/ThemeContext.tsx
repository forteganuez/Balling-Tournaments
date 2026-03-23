import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { NativeWindStyleSheet } from 'nativewind';
import { lightTheme, darkTheme } from '../constants/theme';
import type { Theme } from '../constants/theme';

type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme_preference';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPreference() {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        // ignore read errors, default to system
      } finally {
        setLoaded(true);
      }
    }

    loadPreference();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    SecureStore.setItemAsync(STORAGE_KEY, newMode).catch(() => {
      // ignore write errors
    });
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    NativeWindStyleSheet.setColorScheme(mode);
  }, [loaded, mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark, mode, setMode }),
    [theme, isDark, mode, setMode],
  );

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
