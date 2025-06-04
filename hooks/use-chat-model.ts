'use client';

import { useState, useEffect, useCallback } from 'react';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';

export function useChatModel(initialModel: string) {
  console.log('🔧 Chat Model Hook: Initializing with model:', initialModel);

  const [selectedChatModel, setSelectedChatModel] = useState(initialModel);

  // Update the model and save to cookie
  const updateChatModel = useCallback(
    async (modelId: string) => {
      console.log(
        '🔄 Chat Model Hook: Updating model from',
        selectedChatModel,
        'to',
        modelId,
      );

      setSelectedChatModel(modelId);

      try {
        await saveChatModelAsCookie(modelId);
        console.log(
          '✅ Chat Model Hook: Model saved to cookie successfully:',
          modelId,
        );
      } catch (error) {
        console.error(
          '❌ Chat Model Hook: Failed to save model to cookie:',
          error,
        );
      }
    },
    [selectedChatModel],
  );

  // Listen for storage events (when cookie changes in other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const modelFromCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('chat-model='))
        ?.split('=')[1];

      console.log('🔍 Chat Model Hook: Checking cookie for model changes...', {
        cookieModel: modelFromCookie,
        currentModel: selectedChatModel,
        needsUpdate: !!(
          modelFromCookie && modelFromCookie !== selectedChatModel
        ),
      });

      if (modelFromCookie && modelFromCookie !== selectedChatModel) {
        console.log(
          '🔄 Chat Model Hook: Updating model from cookie:',
          modelFromCookie,
        );
        setSelectedChatModel(modelFromCookie);
      }
    };

    // Check once on mount
    handleStorageChange();

    // Listen for storage events (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedChatModel]);

  console.log('📋 Chat Model Hook: Current selected model:', selectedChatModel);

  return {
    selectedChatModel,
    updateChatModel,
  };
}
