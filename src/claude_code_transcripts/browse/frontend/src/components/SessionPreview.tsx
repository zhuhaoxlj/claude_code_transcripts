import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { SessionData } from "../types";
import type { HTMLAttributes } from "react";

interface SessionPreviewProps {
  sessionData: SessionData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Extract all content blocks from message content (text and images)
 */
function extractContentBlocks(content: string | any[]): Array<{type: 'text' | 'image', content: any}> {
  if (typeof content === "string") {
    return [{type: 'text', content: content}];
  }
  if (Array.isArray(content)) {
    const blocks: Array<{type: 'text' | 'image', content: any}> = [];
    for (const block of content) {
      if (typeof block !== "object") continue;

      const blockType = block.type;
      if (blockType === "text" && block.text) {
        blocks.push({type: 'text', content: block.text});
      } else if (blockType === "image") {
        blocks.push({type: 'image', content: block});
      }
    }
    return blocks;
  }
  return [];
}

/**
 * Custom renderer for code blocks with syntax highlighting
 */
const CodeBlock = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const content = String(children).replace(/\n$/, "");

  return match ? (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language={language}
      PreTag="div"
      className="rounded-lg"
    >
      {content}
    </SyntaxHighlighter>
  ) : (
    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
      {children}
    </code>
  );
};

/**
 * SessionPreview component - displays chat-style conversation with markdown
 */
export function SessionPreview({
  sessionData,
  loading,
  error,
}: SessionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [sessionData]);

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fullscreenImage]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading session...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Select a session to preview
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-gray-50"
    >
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Session Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {sessionData.summary || "Conversation"}
          </h2>
        </div>

        {/* Chat Messages */}
        <div className="space-y-6">
          {sessionData.loglines.map((entry, idx) => {
            const isUser = entry.type === "user";
            const content = entry.message?.content;

            // Skip tool results and empty messages
            if (!content) return null;

            const contentBlocks = extractContentBlocks(content as string | { text?: string }[]);

            // Skip compact summary entries
            if (entry.isCompactSummary) return null;

            // Skip empty messages (no text, no images)
            if (contentBlocks.length === 0) return null;

            return (
              <div
                key={idx}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isUser
                      ? "bg-blue-500 text-white order-2 ml-3"
                      : "bg-green-500 text-white order-1 mr-3"
                  }`}
                >
                  {isUser ? "U" : "AI"}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex-1 max-w-[90%] rounded-2xl overflow-hidden ${
                    isUser
                      ? "bg-gray-50 border border-gray-200 order-1"
                      : "bg-white border border-gray-200 order-2"
                  }`}
                >
                  {/* Content blocks (images and markdown text) */}
                  <div className="px-4 py-3 prose prose-sm max-w-none">
                    {contentBlocks.map((block, blockIdx) => {
                      if (block.type === 'image') {
                        const imageBlock = block.content;
                        const source = imageBlock.source || {};
                        const mediaType = source.media_type || 'image/png';
                        const data = source.data;

                        // Handle base64 encoded images
                        if (source.type === 'base64' && data) {
                          const imageUrl = `data:${mediaType};base64,${data}`;
                          return (
                            <div key={blockIdx} className="mb-3 last:mb-0">
                              <img
                                src={imageUrl}
                                alt="User uploaded image"
                                className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '400px' }}
                                onClick={() => setFullscreenImage(imageUrl)}
                                title="Click to view fullscreen"
                              />
                            </div>
                          );
                        }

                        // Handle URL images
                        if (source.type === 'url' && source.url) {
                          return (
                            <div key={blockIdx} className="mb-3 last:mb-0">
                              <img
                                src={source.url}
                                alt="User uploaded image"
                                className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '400px' }}
                                onClick={() => setFullscreenImage(source.url)}
                                title="Click to view fullscreen"
                              />
                            </div>
                          );
                        }

                        return null;
                      } else if (block.type === 'text') {
                        return (
                          <ReactMarkdown
                            key={blockIdx}
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: CodeBlock,
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-2">
                                  {children}
                                </ol>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  className="text-blue-600 hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {block.content}
                          </ReactMarkdown>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fullscreen Image Modal */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(null);
              }}
              aria-label="Close fullscreen image"
            >
              ×
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
