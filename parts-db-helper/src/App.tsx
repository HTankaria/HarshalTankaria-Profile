import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { PartsStoreProvider, useParts } from './store/usePartsStore';
import { AddPartForm } from './components/AddPartForm';
import { PartsTable } from './components/PartsTable';
import { downloadPartsCsv } from './utils/csvExport';

function AppInner() {
  const { parts, clearAll } = useParts();

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Parts DB Helper</h1>
        <p className="text-sm text-slate-400">
          Paste a product web link, review the extracted details, and build up a parts
          database you can export as a CSV ready for{' '}
          <a
            href="https://indabom.com/bom/upload-parts-help/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            IndaBOM's parts upload
          </a>
          .
        </p>
      </header>

      <AddPartForm />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Parts database ({parts.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => downloadPartsCsv(parts)}
            disabled={parts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-2 text-sm font-medium"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (parts.length === 0) return;
              if (confirm('Clear all parts from the database?')) clearAll();
            }}
            disabled={parts.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-700 hover:border-red-500 hover:text-red-400 disabled:opacity-40 px-4 py-2 text-sm"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      <PartsTable />

      <footer className="text-xs text-slate-600 pt-4">
        Data is stored only in this browser (localStorage) — nothing is sent to a server
        except the page-fetch requests used to look up part details from a link.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PartsStoreProvider>
      <AppInner />
    </PartsStoreProvider>
  );
}
