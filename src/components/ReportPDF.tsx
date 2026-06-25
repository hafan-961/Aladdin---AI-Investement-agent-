// ============================================
// Alladin – PDF Report Export (Client-side)
// ============================================
// Uses the browser's native print functionality to generate
// a clean PDF of the analysis report. This avoids heavy
// @react-pdf/renderer dependencies while providing a reliable export.
// ============================================

'use client';

import React from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentState } from '@/lib/agents/state';
import { formatCurrency } from '@/lib/utils';

interface ReportPDFProps {
  data: AgentState;
}

export function ReportPDF({ data }: ReportPDFProps) {
  const handleExportPDF = () => {
    const { company, decision, fundamentals, valuation, sentiment, geopolitics } = data;
    if (!company || !decision) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const actionEmoji = decision.action === 'INVEST' ? '🟢' : decision.action === 'PASS' ? '🔴' : '🟡';
    const actionColor = decision.action === 'INVEST' ? '#10b981' : decision.action === 'PASS' ? '#ef4444' : '#eab308';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Aladdin Report - ${company.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 40px; line-height: 1.6; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin: 24px 0 12px; color: #1a1a2e; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
    h3 { font-size: 16px; margin: 16px 0 8px; color: #333; }
    p { margin: 8px 0; color: #444; font-size: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid ${actionColor}; padding-bottom: 16px; }
    .decision { font-size: 24px; font-weight: 700; color: ${actionColor}; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .metric-card { background: #f8f8fc; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; }
    .metric-value { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .metric-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .disclaimer { margin-top: 32px; padding: 16px; background: #fff8e5; border: 1px solid #ffd54f; border-radius: 8px; font-size: 11px; color: #7a6b00; }
    .source { font-size: 12px; color: #888; margin: 4px 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    .section { page-break-inside: avoid; }
    pre { white-space: pre-wrap; font-family: 'Inter', sans-serif; font-size: 13px; color: #444; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${company.name} (${company.ticker})</h1>
      <p>${company.industry} | ${company.exchange} | ${company.country}</p>
      <p>Current Price: <strong>${formatCurrency(company.currentPrice, company.currency)}</strong></p>
    </div>
    <div style="text-align: right;">
      <div class="decision">${actionEmoji} ${decision.action.replace('_', ' & ')}</div>
      <p>Confidence: ${decision.confidenceScore}%</p>
      <p style="font-size: 12px; color: #888;">Generated ${new Date().toLocaleDateString()}</p>
    </div>
  </div>

  <div class="section">
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">P/E Ratio</div>
        <div class="metric-value">${fundamentals?.metrics.peRatio?.toFixed(1) ?? 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Margin of Safety</div>
        <div class="metric-value">${valuation?.marginOfSafety ? valuation.marginOfSafety.toFixed(1) + '%' : 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Graham Score</div>
        <div class="metric-value">${fundamentals?.score ?? 'N/A'}/100</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sentiment</div>
        <div class="metric-value">${sentiment?.sentimentScore ?? 'N/A'}/100</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Investment Report</h2>
    <pre>${decision.reasoning}</pre>
  </div>

  ${fundamentals ? `
  <div class="section">
    <h2>Fundamental Analysis (Score: ${fundamentals.score}/100)</h2>
    <pre>${fundamentals.analysis}</pre>
  </div>` : ''}

  ${valuation ? `
  <div class="section">
    <h2>Valuation Analysis</h2>
    <p><strong>Graham Value:</strong> ${valuation.grahamValue ? formatCurrency(valuation.grahamValue, company.currency) : 'N/A'}</p>
    <p><strong>DCF Value:</strong> ${valuation.dcfValue ? formatCurrency(valuation.dcfValue, company.currency) : 'N/A'}</p>
    <p><strong>Intrinsic Value:</strong> ${valuation.intrinsicValue ? formatCurrency(valuation.intrinsicValue, company.currency) : 'N/A'}</p>
    <p><strong>Margin of Safety:</strong> ${valuation.marginOfSafety?.toFixed(1) ?? 'N/A'}%</p>
    <h3>Scenario Analysis</h3>
    <p>🐂 Bull Case: ${formatCurrency(valuation.scenarios.bull.price, company.currency)} — ${valuation.scenarios.bull.reasoning}</p>
    <p>📊 Base Case: ${formatCurrency(valuation.scenarios.base.price, company.currency)} — ${valuation.scenarios.base.reasoning}</p>
    <p>🐻 Bear Case: ${formatCurrency(valuation.scenarios.bear.price, company.currency)} — ${valuation.scenarios.bear.reasoning}</p>
    <pre>${valuation.analysis}</pre>
  </div>` : ''}

  ${geopolitics ? `
  <div class="section">
    <h2>Geopolitical & Macro Analysis</h2>
    <pre>${geopolitics.analysis}</pre>
  </div>` : ''}

  <div class="section">
    <h2>Sources</h2>
    ${decision.sources.map(s => `<p class="source">📎 <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; text-decoration: none;">${s.title}</a> — Confidence: ${(s.confidence * 100).toFixed(0)}%</p>`).join('')}
  </div>

  <div class="disclaimer">
    ${decision.disclaimer}
  </div>

  <div class="footer">
    <p>Generated by Aladdin AI Investment Research Agent</p>
    <p>Powered by Benjamin Graham's "The Intelligent Investor" Framework</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportPDF}
      className="gap-2"
      id="export-pdf-button"
    >
      <FileDown className="w-4 h-4" />
      Export PDF
    </Button>
  );
}
