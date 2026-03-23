import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface HelpiChatBubbleProps {
  content: string;
  variant: 'user' | 'assistant';
  isLoading?: boolean;
}

export function HelpiChatBubble({ content, variant, isLoading }: HelpiChatBubbleProps) {
  const isUser = variant === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative max-w-[320px] rounded-2xl px-4 py-3 shadow-md text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground ml-auto rounded-br-sm'
          : 'bg-card text-card-foreground border border-border rounded-bl-sm'
      )}
    >
      {/* Tail */}
      <div
        className={cn(
          'absolute bottom-0 w-3 h-3',
          isUser
            ? 'right-[-4px] bg-primary'
            : 'left-[-4px] bg-card border-l border-b border-border'
        )}
        style={{
          clipPath: isUser
            ? 'polygon(0 0, 100% 0, 0 100%)'
            : 'polygon(100% 0, 100% 100%, 0 0)',
        }}
      />

      {isLoading ? (
        <div className="flex gap-1.5 items-center py-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : isUser ? (
        <p>{content}</p>
      ) : (
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
}
