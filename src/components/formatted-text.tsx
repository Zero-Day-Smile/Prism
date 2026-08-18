import React from "react";

interface FormattedTextProps {
  text?: string | null;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, lineIdx) => {
        // Regex matches **bold**, __bold__, or `code`
        const parts = line.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);

        return (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br />}
            {parts.map((part, partIdx) => {
              if (
                (part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
                (part.startsWith("__") && part.endsWith("__") && part.length > 4)
              ) {
                return (
                  <strong key={partIdx} className="font-semibold text-foreground">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                return (
                  <code
                    key={partIdx}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return part;
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
}
