import ReactMarkdown from "react-markdown"

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose-sm max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-surface-strong/60 px-1 py-0.5 font-mono text-xs">{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
