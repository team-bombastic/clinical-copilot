'use client';

import { useEffect, useRef, useState } from 'react';
import { LATEX_PREVIEW_WARNING, LATEX_WARNING_ICON } from '@/constants/ui-strings';
import styles from './latex-preview.module.css';

interface LatexPreviewProps {
  latexCode: string;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export default function LatexPreview({ latexCode, previewRef }: LatexPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = previewRef || containerRef;

  useEffect(() => {
    if (!latexCode || !ref.current) return;

    setError(null);

    const renderLatex = async () => {
      try {
        const latexjs = await import('latex.js');

        const generator = latexjs.parse(latexCode, {
          generator: new latexjs.HtmlGenerator({
            hyphenate: false,
          }),
        });

        const dom = generator.domFragment();
        ref.current!.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          background: white;
          color: #1a1a1a;
          padding: 40px 50px;
          min-height: 842px;
          width: 595px;
          margin: 0 auto;
          font-family: 'Computer Modern Serif', 'Latin Modern Roman', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.5;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          overflow: auto;
        `;

        wrapper.appendChild(dom);

        const styleEl = document.createElement('style');
        styleEl.textContent = generator.stylesAndScripts();
        wrapper.prepend(styleEl);

        ref.current!.appendChild(wrapper);
      } catch (err) {
        console.warn('LaTeX.js rendering failed, falling back to formatted code view:', err);
        setError(LATEX_PREVIEW_WARNING);

        if (ref.current) {
          ref.current.innerHTML = '';

          const wrapper = document.createElement('div');
          wrapper.style.cssText = `
            background: white;
            color: #1a1a1a;
            padding: 40px 50px;
            min-height: 842px;
            width: 595px;
            margin: 0 auto;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            overflow: auto;
          `;

          const html = latexToSimpleHtml(latexCode);
          wrapper.innerHTML = html;
          ref.current.appendChild(wrapper);
        }
      }
    };

    renderLatex();
  }, [latexCode, ref]);

  return (
    <div>
      {error && (
        <div className={styles.warningBanner}>
          <span className={styles.warningIcon}>{LATEX_WARNING_ICON}</span> {error}
        </div>
      )}
      <div ref={ref} className={styles.previewContainer} />
    </div>
  );
}

/**
 * Simple LaTeX → HTML fallback parser for when latex.js fails.
 */
function latexToSimpleHtml(latex: string): string {
  const docMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  let content = docMatch ? docMatch[1] : latex;

  const titleMatch = latex.match(/\\title\{([^}]*)\}/);
  const authorMatch = latex.match(/\\author\{([^}]*)\}/);

  let header = '';
  if (titleMatch) {
    header += `<h1 style="text-align:center;margin-bottom:4px;font-size:18pt;">${titleMatch[1]}</h1>`;
  }
  if (authorMatch) {
    header += `<p style="text-align:center;color:#555;margin-top:0;">${authorMatch[1]}</p>`;
  }

  content = content.replace(/\\maketitle/g, '');

  content = content.replace(
    /\\section\*?\{([^}]*)\}/g,
    '<h2 style="font-size:14pt;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px;">$1</h2>'
  );
  content = content.replace(
    /\\subsection\*?\{([^}]*)\}/g,
    '<h3 style="font-size:12pt;margin-top:16px;">$1</h3>'
  );

  content = content.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
  content = content.replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>');
  content = content.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  content = content.replace(/\\emph\{([^}]*)\}/g, '<em>$1</em>');

  content = content.replace(
    /\\rule\{([^}]*)\}\{([^}]*)\}/g,
    '<span style="display:inline-block;border-bottom:1px solid #333;min-width:150px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'
  );

  content = content.replace(
    /\\hrule|\\noindent\\rule\{\\textwidth\}\{[^}]*\}/g,
    '<hr style="border:none;border-top:1px solid #333;margin:12px 0;" />'
  );

  content = content.replace(/\\begin\{itemize\}/g, '<ul>');
  content = content.replace(/\\end\{itemize\}/g, '</ul>');
  content = content.replace(/\\begin\{enumerate\}/g, '<ol>');
  content = content.replace(/\\end\{enumerate\}/g, '</ol>');
  content = content.replace(/\\item\s*/g, '<li>');

  content = content.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div style="text-align:center;">$1</div>'
  );

  content = content.replace(/\\\\/g, '<br/>');
  content = content.replace(/\\newline/g, '<br/>');
  content = content.replace(/\\vspace\{[^}]*\}/g, '<div style="margin-top:12px;"></div>');
  content = content.replace(/\\hspace\{[^}]*\}/g, '&nbsp;&nbsp;');
  content = content.replace(/\\noindent/g, '');
  content = content.replace(/\\par\b/g, '<br/><br/>');

  content = content.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  content = content.replace(/\\[a-zA-Z]+/g, '');

  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  content = paragraphs
    .map((p) => {
      if (
        p.startsWith('<h') ||
        p.startsWith('<ul') ||
        p.startsWith('<ol') ||
        p.startsWith('<div') ||
        p.startsWith('<hr')
      ) {
        return p;
      }
      return `<p style="margin:8px 0;">${p}</p>`;
    })
    .join('\n');

  return header + content;
}
