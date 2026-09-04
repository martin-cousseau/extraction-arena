import type { ReactNode } from 'react';

/** Literal Tailwind class names so the scanner keeps `text-gt` etc. */
const ACCENT_TEXT: Record<string, string> = {
  '#10B981': 'text-gt',
  '#06B6D4': 'text-glm',
  '#8B5CF6': 'text-gpt',
  '#F43F5E': 'text-grok',
};

function accentTextClass(accent: string): string {
  return ACCENT_TEXT[accent] ?? '';
}

const TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:\s*)?|(\{|\}|\[|\])|(\b-?\d+(?:\.\d+)?\b)|([^\s{}\[\],]+)/g;

function tokenizeLine(line: string, accent: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const textClass = accentTextClass(accent);
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m[1] !== undefined) {
      const isKey = m[2] !== undefined;
      parts.push(
        isKey ? (
          <span key={key++} className="text-muted-foreground">
            {m[1]}
          </span>
        ) : textClass ? (
          <span key={key++} className={textClass}>
            {m[1]}
          </span>
        ) : (
          <span key={key++} style={{ color: accent }}>
            {m[1]}
          </span>
        ),
      );
      if (m[2]) parts.push(<span key={key++}>{m[2]}</span>);
    } else if (m[3]) {
      parts.push(
        <span key={key++} className="text-foreground">
          {m[3]}
        </span>,
      );
    } else if (m[4]) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {m[4]}
        </span>,
      );
    } else if (m[5]) {
      parts.push(
        <span key={key++} className="text-foreground">
          {m[5]}
        </span>,
      );
    }
  }
  return parts;
}

export function highlightBlock(text: string, accent: string): ReactNode[] {
  return text.split('\n').map((line, i) => (
    <span key={i} className="block">
      {tokenizeLine(line, accent)}
      {'\n'}
    </span>
  ));
}
