import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QuickProduct, QuickProductCategory } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MinusCircle, HelpCircle, RotateCcw } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import QuickProductCategoriesDialog from "@/components/quickProducts/QuickProductCategoriesDialog";

// Manage Quick Products — CoreBridge-style list. Tabs switch between the
// user's products, shared global products, and deactivated products.
const TABS = [
  { key: "my", label: "My Products" },
  { key: "global", label: "Global Products" },
  { key: "inactive", label: "Inactive Products" },
];

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function QuickProducts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("my");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [showCategories, setShowCategories] = useState(false);

  const load = async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([
      QuickProduct.list("product_name", 1000),
      QuickProductCategory.list("category_name", 500),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [tab, debouncedSearch, categoryFilter, perPage]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return (products || []).filter((p) => {
      const active = p.is_active !== false;
      if (tab === "inactive" ? active : !active) return false;
      if (tab !== "inactive" && (p.product_group || "my") !== tab) return false;
      if (categoryFilter !== "all" && !(p.categories || []).includes(categoryFilter)) return false;
      if (term && !p.product_name?.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products, tab, debouncedSearch, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const setActive = async (product, active) => {
    await QuickProduct.update(product.id, { is_active: active });
    load();
  };

  return (
    <div className="bg-slate-200 min-h-screen py-4">
      <div className="max-w-6xl mx-auto bg-white shadow-sm p-5">
        <h1 className="text-sm font-bold uppercase tracking-wider text-lime-600 mb-4">Manage Quick Products</h1>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm ${
                tab === t.key ? "bg-zinc-700 text-lime-400" : "bg-zinc-700 text-white hover:bg-zinc-600"
              }`}>
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <Link to={createPageUrl("QuickProductEditor")}>
            <Button size="sm" className="h-8 rounded-sm bg-lime-600 hover:bg-lime-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> New Quick Product
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div>
            <Label className="text-xs">Search</Label>
            <Input className="h-8 rounded-sm w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 rounded-sm w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- All --</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button onClick={() => setShowCategories(true)} className="text-sm text-blue-600 hover:underline flex items-center gap-1 pb-1.5">
            Manage Categories <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-end gap-2">
            <span className="text-xs text-slate-600 pb-2">Show</span>
            <Select value={String(perPage)} onValueChange={(v) => setPerPage(parseInt(v))}>
              <SelectTrigger className="h-8 rounded-sm w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-600 pb-2">Products per page</span>
          </div>
        </div>

        <table className="w-full text-sm border border-slate-300">
          <thead>
            <tr className="bg-slate-600 text-white text-left">
              <th className="px-3 py-2 font-semibold">Quick Product</th>
              <th className="px-3 py-2 font-semibold w-64">Categories</th>
              <th className="px-3 py-2 font-semibold w-32 text-right">Price</th>
              <th className="px-3 py-2 font-semibold w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-6 text-slate-500">Loading products…</td></tr>}
            {!loading && pageRows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No quick products found.</td></tr>
            )}
            {pageRows.map((p, i) => (
              <tr key={p.id} className={`border-t border-slate-200 ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
                <td className="px-3 py-2">
                  <button className="text-blue-600 hover:underline text-left"
                    onClick={() => navigate(`${createPageUrl("QuickProductEditor")}?id=${p.id}`)}>
                    {p.product_name}
                  </button>
                </td>
                <td className="px-3 py-2 text-blue-700">{(p.categories || []).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmtCurrency(p.total_price)}</td>
                <td className="px-3 py-2 text-center">
                  {p.is_active === false ? (
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-green-600 hover:bg-green-50"
                      title="Reactivate" onClick={() => setActive(p, true)}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-600 hover:bg-red-50"
                      title="Deactivate" onClick={() => setActive(p, false)}>
                      <MinusCircle className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between mt-3 text-xs text-slate-600">
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of{" "}
            <strong>{filtered.length} Products</strong>
          </span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 hover:underline" onClick={() => setPage(1)} disabled={page === 1}>First</button>
            <button className="px-2 py-1 hover:underline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-2 py-1 border ${page === n ? "bg-slate-300 border-slate-400 font-bold" : "border-transparent hover:underline"}`}>
                {n}
              </button>
            ))}
            <button className="px-2 py-1 hover:underline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
            <button className="px-2 py-1 hover:underline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</button>
          </div>
        </div>
      </div>

      {showCategories && (
        <QuickProductCategoriesDialog
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}