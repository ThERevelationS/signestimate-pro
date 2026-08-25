import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Loads every admin-managed list the customer forms need:
// option lists, tax groups, and the SALESPEOPLE (which are app users flagged
// as salespeople on the Estimate Settings page, shown by their screen name).
export function userDisplayName(u) {
  return u.screen_name || u.full_name || u.email;
}

export default function useCustomerLists() {
  const [options, setOptions] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [opts, taxes, users] = await Promise.all([
        base44.entities.EstimateOption.list("sort_order", 1000),
        base44.entities.TaxGroup.list("sort_order", 300),
        base44.entities.User.list("full_name", 500).catch(() => []),
      ]);
      setOptions(opts || []);
      setTaxGroups(taxes || []);
      setSalespeople((users || []).filter((u) => u.is_salesperson));
      setLoading(false);
    })();
  }, []);

  const listValues = (type) =>
    options.filter((o) => o.option_type === type && o.is_active !== false).map((o) => o.label);

  return { options, taxGroups, salespeople, salespersonNames: salespeople.map(userDisplayName), listValues, loading };
}