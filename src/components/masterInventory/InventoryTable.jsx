import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Package } from "lucide-react";

const formatCell = (val, field) => {
  if (val === null || val === undefined || val === "") return "—";
  if (field.type === "number") {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return "—";
    if (field.label.includes("$") || field.name.includes("cost")) {
      return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return n.toLocaleString();
  }
  if (field.type === "boolean") return val ? "Yes" : "No";
  return String(val).replace(/_/g, " ");
};

export default function InventoryTable({ source, items, canEdit, onEdit, onDelete, onInlineToggle }) {
  const tableFields = source.fields.filter((f) => f.table);

  const handleToggle = async (item, field, next) => {
    if (!canEdit) return;
    try {
      await source.entity.update(item.id, { [field.name]: next });
      onInlineToggle?.(item.id, field.name, next);
    } catch (e) {
      console.error("Toggle failed:", e);
      alert("Failed to update toggle.");
    }
  };

  if (!items.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="font-medium">No items found</p>
        <p className="text-sm">
          {canEdit ? "Click \"Add Item\" to create your first one." : "Ask an admin to add items here."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50">
          <tr className="text-left">
            {tableFields.map((f) => (
              <th key={f.name} className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                {f.label}
              </th>
            ))}
            {canEdit && <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              {tableFields.map((f, idx) => (
                <td key={f.name} className="px-4 py-3 align-top">
                  {idx === 0 ? (
                    <span className="font-medium text-slate-900">{formatCell(item[f.name], f)}</span>
                  ) : f.type === "boolean" ? (
                    canEdit ? (
                      <Switch
                        checked={!!item[f.name]}
                        onCheckedChange={(next) => handleToggle(item, f, next)}
                      />
                    ) : (
                      <span className="text-slate-700">{formatCell(item[f.name], f)}</span>
                    )
                  ) : f.type === "select" ? (
                    <Badge variant="outline" className="font-normal">
                      {formatCell(item[f.name], f)}
                    </Badge>
                  ) : (
                    <span className="text-slate-700">{formatCell(item[f.name], f)}</span>
                  )}
                </td>
              ))}
              {canEdit && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}