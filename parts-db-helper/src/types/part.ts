// Field set mirrors the IndaBOM parts CSV upload format:
// https://indabom.com/bom/upload-parts-help/
export interface Part {
  id: string;
  sourceUrl: string;

  part_number: string;
  part_class: string;
  revision: string;
  description: string;

  manufacturer_name: string;
  manufacturer_part_number: string;

  seller: string;
  unit_cost: string;
  nre_cost: string;
  seller_part_number: string;
  minimum_order_quantity: string;
  minimum_pack_quantity: string;
  lead_time_days: string;
}

export const EMPTY_PART: Omit<Part, 'id' | 'sourceUrl'> = {
  part_number: '',
  part_class: '',
  revision: '1',
  description: '',
  manufacturer_name: '',
  manufacturer_part_number: '',
  seller: '',
  unit_cost: '',
  nre_cost: '',
  seller_part_number: '',
  minimum_order_quantity: '',
  minimum_pack_quantity: '',
  lead_time_days: '',
};

// Column order expected by the IndaBOM parts upload CSV.
export const INDABOM_COLUMNS: (keyof Omit<Part, 'id' | 'sourceUrl'>)[] = [
  'part_number',
  'part_class',
  'revision',
  'description',
  'manufacturer_name',
  'manufacturer_part_number',
  'seller',
  'unit_cost',
  'nre_cost',
  'seller_part_number',
  'minimum_order_quantity',
  'minimum_pack_quantity',
  'lead_time_days',
];
