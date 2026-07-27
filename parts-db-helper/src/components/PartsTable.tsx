import React from 'react';
import { Trash2 } from 'lucide-react';
import { INDABOM_COLUMNS, Part } from '../types/part';
import { useParts } from '../store/usePartsStore';

const LABELS: Record<(typeof INDABOM_COLUMNS)[number], string> = {
  part_number: 'Part #',
  part_class: 'Class',
  revision: 'Rev',
  description: 'Description',
  manufacturer_name: 'Mfg',
  manufacturer_part_number: 'MPN',
  seller: 'Seller',
  unit_cost: 'Unit cost',
  nre_cost: 'NRE cost',
  seller_part_number: 'Seller P/N',
  minimum_order_quantity: 'MOQ',
  minimum_pack_quantity: 'MPQ',
  lead_time_days: 'Lead time',
};

function EditableCell({ part, field }: { part: Part; field: (typeof INDABOM_COLUMNS)[number] }) {
  const { updatePart } = useParts();
  return (
    <input
      value={part[field]}
      onChange={e => updatePart(part.id, { [field]: e.target.value })}
      className="w-full min-w-[6rem] bg-transparent text-sm px-2 py-1.5 outline-none focus:bg-slate-900 rounded"
    />
  );
}

export function PartsTable() {
  const { parts, removePart } = useParts();

  if (parts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
        No parts yet. Paste a product link above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-x-auto">
      <table className="min-w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-800/60 border-b border-slate-700">
            {INDABOM_COLUMNS.map(col => (
              <th key={col} className="px-2 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {LABELS[col]}
              </th>
            ))}
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {parts.map(part => (
            <tr key={part.id} className="border-b border-slate-800 hover:bg-slate-800/30">
              {INDABOM_COLUMNS.map(col => (
                <td key={col} className="px-1">
                  <EditableCell part={part} field={col} />
                </td>
              ))}
              <td className="px-2">
                <button
                  onClick={() => removePart(part.id)}
                  className="text-slate-500 hover:text-red-400 p-1.5"
                  aria-label="Remove part"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
