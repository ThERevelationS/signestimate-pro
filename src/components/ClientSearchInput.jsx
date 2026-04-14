import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/all';
import { Loader2 } from 'lucide-react';

export default function ClientSearchInput({ value, onChange, onSelectProject, className, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    User.me().then(u => {
      if (u && u.enable_ccs_database_lookup) setEnabled(true);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    onChange(val);
    
    if (!enabled) return;
    
    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('searchExternalClients', { search: val });
        if (res.data && res.data.results) {
          setResults(res.data.results);
          setIsOpen(res.data.results.length > 0);
        } else {
          setIsOpen(false);
        }
      } catch (e) {
        console.error("External search failed:", e);
        setIsOpen(false);
      }
      setLoading(false);
    }, 400); // 400ms debounce
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        className={className}
        placeholder={enabled ? "Search CCS Database or type custom name..." : placeholder}
      />
      {enabled && loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
      )}
      {isOpen && enabled && results.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
              onClick={() => {
                setQuery(r.client_name);
                onChange(r.client_name);
                if (onSelectProject) onSelectProject({
                  client_name: r.client_name,
                  project_name: r.project_name,
                  estimate_number: r.estimate_number,
                  hyperlink: r.hyperlink
                });
                setIsOpen(false);
              }}
            >
              <div className="font-medium text-sm text-slate-900">{r.client_name}</div>
              {(r.project_name || r.estimate_number) && (
                  <div className="text-xs text-slate-500 mt-0.5">
                      {r.project_name} {r.project_name && r.estimate_number ? ' | ' : ''} {r.estimate_number ? `Est: ${r.estimate_number}` : ''}
                  </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}