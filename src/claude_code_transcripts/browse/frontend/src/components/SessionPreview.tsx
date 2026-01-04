import { useEffect, useRef } from "react";
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
 * Extract text content from message content
 */
function extractText(content: string | { text?: string }[]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => (typeof block === "object" && block.text ? block.text : ""))
      .join("\n");
  }
  return "";
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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [sessionData]);

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

            const text = extractText(content as string | { text?: string }[]);

            // Skip compact summary entries
            if (entry.isCompactSummary) return null;

            // Skip empty messages
            if (!text.trim()) return null;

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
                  {/* Markdown content for both user and assistant */}
                  <div className="px-4 py-3 prose prose-sm max-w-none">
                    <ReactMarkdown
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
                      {text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
