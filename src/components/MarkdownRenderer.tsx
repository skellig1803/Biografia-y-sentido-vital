import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    try {
      return marked.parse(content, {
        gfm: true,
        breaks: true,
      }) as string;
    } catch (e) {
      console.error('Error rendering markdown:', e);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
