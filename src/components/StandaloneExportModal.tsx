import React, { useState } from 'react';
import { getStandaloneHtmlCode } from '../standaloneCode';
import { X, Download, Copy, Check, ExternalLink, Globe } from 'lucide-react';

interface StandaloneExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandaloneExportModal: React.FC<StandaloneExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    const code = getStandaloneHtmlCode();
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const code = getStandaloneHtmlCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Single-File index.html (GitHub Pages Ready)
              </h3>
              <p className="text-xs text-slate-500">
                100% client-side HTML, CSS, and vanilla JS with zero server dependencies
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 leading-relaxed">
            <strong>How to host on GitHub Pages:</strong>
            <ol className="list-decimal ml-5 mt-2 space-y-1.5">
              <li>Click <strong>Download index.html</strong> below.</li>
              <li>Create a new repository on GitHub (or use your existing one).</li>
              <li>Commit or upload this single <code>index.html</code> file to the root of the repo (or branch).</li>
              <li>In your GitHub repo, go to <strong>Settings &rarr; Pages</strong> and set Branch to <strong>main</strong> / root.</li>
              <li>Your app is instantly live at <code>https://&lt;username&gt;.github.io/&lt;repo&gt;/</code>!</li>
            </ol>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 font-mono text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800 mb-1">Architecture Features:</div>
            <div>&bull; PapaParse CDN for parsing CSVs in the browser</div>
            <div>&bull; html2pdf.js CDN for client-side PDF downloads</div>
            <div>&bull; JSZip CDN for batch downloading all student PDFs</div>
            <div>&bull; Built-in column remapping & comments to adjust column names in JS</div>
            <div>&bull; Zero backend, zero telemetry, completely offline-compatible</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Download index.html File
            </button>
            <button
              onClick={handleCopy}
              className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied HTML Code!' : 'Copy Code to Clipboard'}
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
