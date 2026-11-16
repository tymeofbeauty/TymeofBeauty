import React from 'react';
import { parseMarkdownBlocks, sanitizeLinkUrl } from '../utils/logic';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.length}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key} className="font-semibold text-black">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          className="px-1.5 py-0.5 bg-neutral-200/80 text-neutral-900 rounded text-[0.85em] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const safeUrl = sanitizeLinkUrl(linkMatch[2]);
        if (safeUrl) {
          parts.push(
            <a
              key={key}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 font-medium text-black hover:text-neutral-600"
            >
              {linkMatch[1]}
            </a>
          );
        } else {
          parts.push(linkMatch[1]);
        }
      } else {
        parts.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed break-words ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h3 key={index} className="text-base font-bold text-black pt-1">
                {renderInline(block.text)}
              </h3>
            );
          }
          if (block.level === 2) {
            return (
              <h4 key={index} className="text-sm font-bold text-black pt-1">
                {renderInline(block.text)}
              </h4>
            );
          }
          return (
            <h5 key={index} className="text-sm font-semibold text-neutral-900 pt-0.5">
              {renderInline(block.text)}
            </h5>
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              key={index}
              className="bg-neutral-900 text-neutral-100 rounded-lg p-3 overflow-x-auto text-xs font-mono"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={index}
              className="pl-3 py-1 bg-neutral-100 rounded-r-lg text-neutral-700 italic text-xs"
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc pl-5 space-y-1">
              {block.items.map((item, idx) => (
                <li key={idx}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={index} className="list-decimal pl-5 space-y-1">
              {block.items.map((item, idx) => (
                <li key={idx}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
};
