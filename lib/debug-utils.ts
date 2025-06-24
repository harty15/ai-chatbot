// Debugging utilities for the chatbot

export function logNetworkRequest(url: string, options?: RequestInit) {
  console.log('🌐 Network Request:', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    hasBody: !!options?.body,
    bodyType: options?.body ? typeof options.body : 'none',
  });
}

export function logNetworkResponse(response: Response, data?: any) {
  console.log('🌐 Network Response:', {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    hasData: !!data,
    dataType: data ? typeof data : 'none',
  });
}

export function logChatState(state: {
  messages?: any[];
  status?: string;
  input?: string;
  attachments?: any[];
}) {
  console.log('💬 Chat State:', {
    messageCount: state.messages?.length || 0,
    status: state.status || 'unknown',
    inputLength: state.input?.length || 0,
    attachmentCount: state.attachments?.length || 0,
    lastMessagePreview: state.messages?.at(-1)?.content?.slice(0, 50) + '...' || 'No messages',
  });
}

export function logFormSubmission(formData: {
  chatId?: string;
  input?: string;
  attachments?: any[];
  model?: string;
}) {
  console.log('📝 Form Submission:', {
    chatId: formData.chatId,
    inputLength: formData.input?.length || 0,
    attachmentCount: formData.attachments?.length || 0,
    model: formData.model,
    inputPreview: formData.input?.slice(0, 100) + (formData.input && formData.input.length > 100 ? '...' : '') || 'Empty',
  });
}

export function createTimestamp() {
  return new Date().toISOString();
}

export function logWithTimestamp(message: string, data?: any) {
  console.log(`[${createTimestamp()}] ${message}`, data || '');
}