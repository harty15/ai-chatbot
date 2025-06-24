import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  // Log the request for debugging
  console.log('🌐 fetchWithErrorHandlers: Making request...', {
    url: input.toString(),
    method: init?.method || 'GET',
    hasBody: !!init?.body,
    bodyType: init?.body ? typeof init.body : 'none',
    online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
  });

  try {
    const response = await fetch(input, init);

    console.log('🌐 fetchWithErrorHandlers: Response received...', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      type: response.type,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('❌ fetchWithErrorHandlers: Server error response:', errorData);
        const { code, cause } = errorData;
        throw new ChatSDKError(code as ErrorCode, cause);
      } catch (parseError) {
        console.error('❌ fetchWithErrorHandlers: Failed to parse error response:', parseError);
        throw new ChatSDKError('bad_request:api', response.statusText);
      }
    }

    return response;
  } catch (error: unknown) {
    console.error('❌ fetchWithErrorHandlers: Request failed:', error);
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.error('❌ fetchWithErrorHandlers: User is offline');
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}
