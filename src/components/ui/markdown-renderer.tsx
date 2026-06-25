// ============================================
// Alladin – Markdown Renderer Component
// ============================================
// Converts qualitative markdown text from LLM nodes
// into beautiful semantic HTML elements, eliminating raw text headers/tables.
// ============================================

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Inline formatting helper (handles **bold**)
  const parseInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-[#202124] dark:text-[#f1f3f4]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Split content by lines to process block-level elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Headers (h1, h2, h3)
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-semibold mt-6 mb-3 text-[#202124] dark:text-[#f1f3f4] border-b border-[#eeeeee] dark:border-[#3c4043] pb-1.5">
          {parseInline(line.substring(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-semibold mt-5 mb-2.5 text-[#202124] dark:text-[#f1f3f4]">
          {parseInline(line.substring(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-[#202124] dark:text-[#f1f3f4]">
          {parseInline(line.substring(4))}
        </h3>
      );
      i++;
      continue;
    }

    // 2. Table parsing (detects lines starting with '|')
    if (line.startsWith('|')) {
      const startKey = i;
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      // Parse grid cell matrix
      const rows = tableLines.map(row => 
        row.split('|')
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      );

      if (rows.length > 0) {
        const headers = rows[0];
        // Filter out separator lines (e.g. |---|---|)
        const dataRows = rows.slice(1).filter(r => r.some(cell => !cell.startsWith('---') && !cell.startsWith(':-')));
        
        elements.push(
          <div key={startKey} className="overflow-x-auto my-4 border border-[#e0e0e0] dark:border-[#3c4043] rounded-lg">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8f9fa] dark:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#3c4043]">
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-2.5 font-semibold text-[#202124] dark:text-[#f1f3f4]">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee] dark:divide-[#3c4043]">
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[#f8f9fa] dark:hover:bg-[#202124]/40 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-[#5f6368] dark:text-[#bdc1c6]">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Unordered Lists (- or *)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const startKey = i;
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      elements.push(
        <ul key={startKey} className="list-disc pl-5 space-y-1.5 my-3 text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 4. Ordered Lists (e.g. 1.)
    if (/^\d+\.\s/.test(line)) {
      const startKey = i;
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemLine = lines[i].trim();
        const match = itemLine.match(/^\d+\.\s(.*)/);
        listItems.push(match ? match[1] : itemLine);
        i++;
      }
      elements.push(
        <ol key={startKey} className="list-decimal pl-5 space-y-1.5 my-3 text-[13px] text-[#5f6368] dark:text-[#bdc1c6]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 5. Normal Paragraph
    elements.push(
      <p key={i} className="text-[13px] text-[#5f6368] dark:text-[#bdc1c6] leading-relaxed mb-3">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div className="report-prose font-sans">{elements}</div>;
}
