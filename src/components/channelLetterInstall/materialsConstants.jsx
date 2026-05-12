// Shared constants & labels for the Channel Letter Install Materials inventory.

export const CATEGORIES = [
  { value: "flush_mount_hardware", label: "Flush Mount Hardware", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "halo_lit_hardware", label: "Halo-Lit Hardware", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "raceway_material", label: "Raceway Material", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "dimensional_lettering_hardware", label: "Dimensional Lettering Hardware", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "electrical", label: "Electrical", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "consumable", label: "Consumable", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c;
  return acc;
}, {});

export const CRITERIA_OPTIONS = [
  { value: "per_letter_flat", label: "Per Letter (Flat)", short: "Per Letter" },
  { value: "per_letter_by_size", label: "Per Letter (By Size)", short: "By Size" },
  { value: "per_raceway_foot", label: "Per Raceway (Per Foot)", short: "Per Foot" },
  { value: "per_project_flat", label: "Per Sign (Flat)", short: "Per Sign" },
];

export const CRITERIA_MAP = CRITERIA_OPTIONS.reduce((acc, c) => {
  acc[c.value] = c;
  return acc;
}, {});

export const APPLIES_TO_LABEL = {
  flush_mount: "Flush Mount",
  halo_lit: "Halo-Lit",
  raceway: "Raceway",
  dimensional_lettering: "Dimensional Lettering",
};

export const emptyMaterialItem = () => ({
  item_name: "",
  category: "flush_mount_hardware",
  applies_to: "all",
  applies_to_list: [],
  pricing_mode: "per_letter_flat",
  cost_per_letter: 0,
  cost_extra_small: 0,
  cost_small: 0,
  cost_medium: 0,
  cost_large: 0,
  cost_extra_large: 0,
  cost_extra_extra_large: 0,
  cost_per_foot: 0,
  cost_flat: 0,
  unit: "ea",
  supplier: "",
  notes: "",
  is_default: true,
  sort_order: 0,
});

// Headline cost shown in collapsed card view
export const summarizeCost = (item) => {
  switch (item.pricing_mode) {
    case "per_letter_flat":
      return `$${(parseFloat(item.cost_per_letter) || 0).toFixed(2)} / letter`;
    case "per_letter_by_size": {
      const vals = [
        item.cost_extra_small, item.cost_small, item.cost_medium,
        item.cost_large, item.cost_extra_large, item.cost_extra_extra_large,
      ].map(v => parseFloat(v) || 0).filter(v => v > 0);
      if (vals.length === 0) return "By size — not set";
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return min === max ? `$${min.toFixed(2)} / letter` : `$${min.toFixed(2)} – $${max.toFixed(2)} / letter`;
    }
    case "per_raceway_foot":
      return `$${(parseFloat(item.cost_per_foot) || 0).toFixed(2)} / ft`;
    case "per_project_flat":
      return `$${(parseFloat(item.cost_flat) || 0).toFixed(2)} / sign`;
    default:
      return "";
  }
};