'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useChatModel } from '@/hooks/use-chat-model';
import { ChatSDKError } from '@/lib/errors';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { selectedChatModel, updateChatModel } = useChatModel(initialChatModel);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => {
      console.log('🔄 Chat: Preparing request body...', {
        chatId: id,
        messageCount: body.messages.length,
        lastMessage: body.messages.at(-1)?.content?.slice(0, 100) + '...',
        selectedChatModel,
        visibilityType,
      });
      return {
        id,
        message: body.messages.at(-1),
        selectedChatModel: selectedChatModel,
        selectedVisibilityType: visibilityType,
      };
    },
    onFinish: () => {
      console.log('✅ Chat: Message finished successfully');
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('❌ Chat: Error occurred:', error);
      if (error instanceof ChatSDKError) {
        console.error('❌ Chat: ChatSDKError details:', {
          message: error.message,
          code: error.code,
          surface: error.surface,
        });
        toast({
          type: 'error',
          description: error.message,
        });
      } else {
        console.error('❌ Chat: Unexpected error:', error);
        toast({
          type: 'error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  // Add status monitoring
  useEffect(() => {
    console.log('🔄 Chat: Status changed:', status);
  }, [status]);

  useEffect(() => {
    console.log('📝 Chat: Messages updated:', {
      count: messages.length,
      lastMessage: messages.at(-1)?.content?.slice(0, 100) + '...' || 'No messages',
    });
  }, [messages]);

  useEffect(() => {
    console.log('💭 Chat: Input changed:', {
      length: input.length,
      preview: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
    });
  }, [input]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-white dark:bg-zinc-900">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          onModelChange={updateChatModel}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-white dark:bg-zinc-900 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
