import React, { useState } from 'react';
import { Loader2, PlusCircle, Search } from 'lucide-react';
import { InputField } from './ui/InputField';
import { EMPTY_PART, Part } from '../types/part';
import { useParts } from '../store/usePartsStore';
import { extractFromHtml, extractFromUrl, isFetchableUrl } from '../utils/urlExtractor';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddPartForm() {
  const { addPart } = useParts();
  const [url, setUrl] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [showPasteHtml, setShowPasteHtml] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Omit<Part, 'id'>>({ ...EMPTY_PART, sourceUrl: '' });

  const setField = (key: keyof Omit<Part, 'id'>) => (value: string) =>
    setDraft(d => ({ ...d, [key]: value }));

  async function handleFetch() {
    setError('');
    if (!isFetchableUrl(url)) {
      setError('Enter a valid http(s) URL first.');
      return;
    }
    setStatus('loading');
    try {
      const fields = await extractFromUrl(url);
      setDraft(d => ({ ...d, ...fields, sourceUrl: url }));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Extraction failed.');
      setShowPasteHtml(true);
    }
  }

  function handleExtractFromPastedHtml() {
    setError('');
    if (!pastedHtml.trim()) {
      setError('Paste the page HTML (View Source / Save Page) first.');
      return;
    }
    try {
      const fields = extractFromHtml(pastedHtml, url || 'about:blank');
      setDraft(d => ({ ...d, ...fields, sourceUrl: url }));
    } catch {
      setError('Could not parse the pasted HTML.');
    }
  }

  function handleAdd() {
    if (!draft.part_number.trim() && !draft.description.trim()) {
      setError('Add at least a part number or description before saving.');
      return;
    }
    addPart({ ...draft, id: newId() });
    setDraft({ ...EMPTY_PART, sourceUrl: '' });
    setUrl('');
    setPastedHtml('');
    setShowPasteHtml(false);
    setError('');
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Product web link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.example.com/product/..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500 min-w-0"
          />
          <button
            onClick={handleFetch}
            disabled={status === 'loading'}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-sm font-medium whitespace-nowrap"
          >
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Fetch details
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {showPasteHtml && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs text-slate-500">
              Automatic fetch failed (many sites block this). Paste the page's HTML source instead
              (right-click the product page → "View Page Source" → copy all → paste below).
            </p>
            <textarea
              value={pastedHtml}
              onChange={e => setPastedHtml(e.target.value)}
              placeholder="Paste page HTML here..."
              rows={4}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
            />
            <button
              onClick={handleExtractFromPastedHtml}
              className="self-start rounded-lg border border-slate-600 hover:border-slate-500 px-3 py-1.5 text-xs"
            >
              Extract from pasted HTML
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField label="Part number" value={draft.part_number} onChange={setField('part_number')} />
        <InputField label="Part class" value={draft.part_class} onChange={setField('part_class')} />
        <InputField label="Revision" value={draft.revision} onChange={setField('revision')} />
        <InputField label="Description" value={draft.description} onChange={setField('description')} />
        <InputField label="Manufacturer name" value={draft.manufacturer_name} onChange={setField('manufacturer_name')} />
        <InputField label="Manufacturer part number (MPN)" value={draft.manufacturer_part_number} onChange={setField('manufacturer_part_number')} />
        <InputField label="Seller" value={draft.seller} onChange={setField('seller')} />
        <InputField label="Unit cost" value={draft.unit_cost} onChange={setField('unit_cost')} />
        <InputField label="NRE cost" value={draft.nre_cost} onChange={setField('nre_cost')} />
        <InputField label="Seller part number" value={draft.seller_part_number} onChange={setField('seller_part_number')} />
        <InputField label="Minimum order quantity" value={draft.minimum_order_quantity} onChange={setField('minimum_order_quantity')} />
        <InputField label="Minimum pack quantity" value={draft.minimum_pack_quantity} onChange={setField('minimum_pack_quantity')} />
        <InputField label="Lead time (days)" value={draft.lead_time_days} onChange={setField('lead_time_days')} />
      </div>

      <button
        onClick={handleAdd}
        className="self-start flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-medium"
      >
        <PlusCircle size={16} />
        Add to database
      </button>
    </div>
  );
}
