'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';

// Debounce utility for cookie saves
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useChatModel(initialModel: string) {
  const [selectedChatModel, setSelectedChatModel] = useState(initialModel);
  const [pendingSave, setPendingSave] = useState(false);
  
  // Debounce model changes to avoid excessive cookie saves
  const debouncedModel = useDebounce(selectedChatModel, 300);

  // Memoize the cookie save function
  const saveToCookie = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return async (modelId: string) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          await saveChatModelAsCookie(modelId);
          setPendingSave(false);
        } catch (error) {
          console.warn('Failed to save model preference:', error);
          setPendingSave(false);
        }
      }, 100);
    };
  }, []);

  // Update the model (optimistic update)
  const updateChatModel = useCallback(
    (modelId: string) => {
      if (modelId === selectedChatModel) return;
      
      setSelectedChatModel(modelId);
      setPendingSave(true);
    },
    [selectedChatModel],
  );

  // Save debounced model to cookie
  useEffect(() => {
    if (debouncedModel !== initialModel && pendingSave) {
      saveToCookie(debouncedModel);
    }
  }, [debouncedModel, initialModel, pendingSave, saveToCookie]);

  // Listen for storage events (cross-tab sync) - throttled
  useEffect(() => {
    let lastCheck = 0;
    
    const handleStorageChange = () => {
      const now = Date.now();
      if (now - lastCheck < 1000) return; // Throttle to 1 second
      lastCheck = now;
      
      const modelFromCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('chat-model='))
        ?.split('=')[1];

      if (modelFromCookie && modelFromCookie !== selectedChatModel) {
        setSelectedChatModel(modelFromCookie);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChatModel]);

  return {
    selectedChatModel,
    updateChatModel,
  };
}
