'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { VisibilityType } from './visibility-selector';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  selectedVisibilityType,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  selectedVisibilityType: VisibilityType;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = useCallback(() => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('🔄 MultimodalInput: Already submitting, ignoring...');
      return;
    }

    if (status !== 'ready') {
      toast.error('Please wait for the model to finish its response!');
      return;
    }

    if (!input.trim() && attachments.length === 0) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    setIsSubmitting(true);
    console.log('🚀 MultimodalInput: Submitting...', {
      inputLength: input.length,
      attachmentCount: attachments.length,
    });

    window.history.replaceState({}, '', `/chat/${chatId}`);

    try {
      handleSubmit(undefined, {
        experimental_attachments: attachments,
      });
      
      // Clear form immediately for snappier UX
      setAttachments([]);
      setLocalStorageInput('');
      resetHeight();

      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    } catch (error) {
      console.error('❌ MultimodalInput: Error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      // Reset submission state after a short delay
      setTimeout(() => setIsSubmitting(false), 1000);
    }
  }, [
    isSubmitting,
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    input,
    status,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const {
          url,
          pathname,
          contentType,
          parsed,
          parsedContent,
          isAttachment,
          error: parseError,
        } = data;

        // Show parsing status without adding content to chat
        if (parsed && parsedContent) {
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          const isPDF = fileExtension === 'pdf';

          if (isPDF) {
            toast.success(
              `PDF "${file.name}" uploaded successfully! Content ready for AI analysis.`,
            );
          } else {
            toast.success(
              `File "${file.name}" uploaded and parsed successfully! Content ready for AI analysis.`,
            );
          }
        } else if (parseError) {
          toast.error(`File "${file.name}" upload failed: ${parseError}`);
        } else if (data.message) {
          // Custom message from server
          toast.success(data.message);
        }

        return {
          url,
          name: file.name || pathname || 'uploaded-file',
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      console.error('Upload API error:', error);
      toast.error(error || 'Upload failed');
    } catch (error) {
      console.error('Upload request failed:', error);
      toast.error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Network error'}`,
      );
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // Add reasonable limit to prevent abuse while still being generous
      if (files.length > 25) {
        toast.error('Maximum 25 files per upload. Please select fewer files.');
        return;
      }

      // Check total size (200MB limit for batch)
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxBatchSize = 200 * 1024 * 1024; // 200MB
      if (totalSize > maxBatchSize) {
        const totalSizeMB = Math.round(totalSize / (1024 * 1024));
        toast.error(
          `Total file size (${totalSizeMB}MB) exceeds 200MB limit. Please select smaller files.`,
        );
        return;
      }

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadResults = await Promise.allSettled(uploadPromises);

        const successfullyUploadedAttachments = uploadResults
          .filter(
            (result) =>
              result.status === 'fulfilled' && result.value !== undefined,
          )
          .map((result) => (result as PromiseFulfilledResult<any>).value);

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);

        // Log failed uploads for debugging
        const failedUploads = uploadResults.filter(
          (result) => result.status === 'rejected',
        );
        if (failedUploads.length > 0) {
          console.error(
            `${failedUploads.length} file(s) failed to upload:`,
            failedUploads,
          );
        }
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
        // Reset file input to allow selecting the same files again
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  return (
    <div className="relative w-full flex flex-col gap-4">
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-28 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            append={append}
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
          />
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        accept=".txt,.md,.markdown,.json,.csv,.xml,.html,.rtf,.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.zip,.rar,.7z,.js,.ts,.py,.java,.cpp,.c,.css,.scss,.less,.php,.rb,.go,.rs,.swift,.kt,.sql"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className={cx(
          'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-white border border-gray-300 shadow-sm pb-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:bg-zinc-800 dark:border-zinc-600',
          className,
        )}
        rows={2}
        autoFocus
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            submitForm();
          }
        }}
      />

      <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
      </div>

      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {status === 'submitted' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            uploadQueue={uploadQueue}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit border border-gray-200 hover:bg-gray-50 dark:border-zinc-700 hover:dark:bg-zinc-900"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  isSubmitting,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  isSubmitting: boolean;
}) {
  const isDisabled = input.length === 0 || uploadQueue.length > 0 || isSubmitting;
  
  return (
    <Button
      data-testid="send-button"
      className={cx(
        "rounded-full p-1.5 h-fit border dark:border-zinc-600 transition-all duration-200",
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
      )}
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) {
          submitForm();
        }
      }}
      disabled={isDisabled}
    >
      <ArrowUpIcon size={14} className={isSubmitting ? "animate-pulse" : ""} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.isSubmitting !== nextProps.isSubmitting) return false;
  return true;
});
