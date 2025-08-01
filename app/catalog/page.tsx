"use client"
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useLanguage } from "@/lib/language-context";

const PAGE_SIZE = 10;

type CatalogItem = {
  id: string;
  classification: string;
  description: string;
  unit: string;
  supplier: string;
  created_by: string;
  created_at: string;
};

function CatalogPageContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'suppliers'>('materials');
  const [newItem, setNewItem] = useState<Partial<CatalogItem>>({
    classification: "",
    description: "",
    unit: ""
  });
  const [newSupplier, setNewSupplier] = useState<Partial<any>>({
    name: "",
    rfc: ""
  });
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("classification");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const [showDescSuggestions, setShowDescSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (activeTab === 'materials') {
        const { data, error } = await supabase
          .from("catalog")
          .select("*")
          .order("classification", { ascending: true });
        console.log("Supabase fetch result:", { data, error });
        if (error) {
          setCatalog([]);
        } else {
          setCatalog(data || []);
        }
      } else {
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .order("name", { ascending: true });
        console.log("Suppliers fetch result:", { data, error });
        if (error) {
          setSuppliers([]);
        } else {
          setSuppliers(data || []);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [activeTab]);

  // Unique classifications for filter
  const classifications = useMemo(() => [
    ...new Set(catalog.map((item) => item.classification))
  ], [catalog]);

  // Filter, search, and sort
  const filtered = useMemo(() => {
    let data = activeTab === 'materials' ? catalog : suppliers;
    if (activeTab === 'materials' && classificationFilter !== "all") {
      data = data.filter(item => item.classification === classificationFilter);
    }
    if (search) {
      if (activeTab === 'materials') {
        data = data.filter(item =>
          item.classification.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.unit.toLowerCase().includes(search.toLowerCase()) ||
          (item.created_by && item.created_by.toLowerCase().includes(search.toLowerCase()))
        );
      } else {
        data = data.filter(item =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.rfc.toLowerCase().includes(search.toLowerCase()) ||
          (item.created_by && item.created_by.toLowerCase().includes(search.toLowerCase()))
        );
      }
    }
    data = [...data].sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (activeTab === 'materials') {
        if (sortBy === "classification") {
          aVal = a.classification;
          bVal = b.classification;
        } else if (sortBy === "description") {
          aVal = a.description;
          bVal = b.description;
        } else if (sortBy === "unit") {
          aVal = a.unit;
          bVal = b.unit;
        } else if (sortBy === "created_at") {
          aVal = a.created_at;
          bVal = b.created_at;
        } else if (sortBy === "created_by") {
          aVal = a.created_by || "";
          bVal = b.created_by || "";
        }
      } else {
        if (sortBy === "name") {
          aVal = a.name;
          bVal = b.name;
        } else if (sortBy === "rfc") {
          aVal = a.rfc;
          bVal = b.rfc;
        } else if (sortBy === "created_at") {
          aVal = a.created_at;
          bVal = b.created_at;
        } else if (sortBy === "created_by") {
          aVal = a.created_by || "";
          bVal = b.created_by || "";
        }
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [catalog, suppliers, search, classificationFilter, sortBy, sortDir, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    setErrorMsg(null);
    
    // Get current user's name for created_by field
    const createdBy = user?.fullName || user?.email || 'system';
    
    if (activeTab === 'materials') {
      if (duplicate || checkingDuplicate || !newItem.classification || !newItem.description || !newItem.unit) return;
      setLoading(true);
      // Insert into Supabase catalog table
      const { error } = await supabase.from('catalog').insert([
        {
          classification: newItem.classification,
          description: newItem.description,
          unit: newItem.unit,
          created_by: createdBy
        }
      ]);
      if (!error) {
        // Refresh catalog list
        const { data } = await supabase
          .from('catalog')
          .select('*')
          .order('classification', { ascending: true });
        setCatalog(data || []);
        setNewItem({ classification: '', description: '', unit: '' });
        setModalOpen(false);
      } else {
        setErrorMsg(t('catalog.failedToAddMaterial'));
        console.error('Supabase insert error:', error);
      }
      setLoading(false);
    } else {
      // Handle supplier addition
      if (!newSupplier.name || !newSupplier.rfc) return;
      
      // Validate RFC length - must be exactly 12 characters
      if (newSupplier.rfc.length !== 12) {
        setErrorMsg(t('catalog.rfcLengthError'));
        return;
      }
      
      setLoading(true);
      // Insert into Supabase suppliers table
      const { error } = await supabase.from('suppliers').insert([
        {
          name: newSupplier.name,
          rfc: newSupplier.rfc,
          created_by: createdBy
        }
      ]);
      if (!error) {
        // Refresh suppliers list
        const { data } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });
        setSuppliers(data || []);
        setNewSupplier({ name: '', rfc: '' });
        setModalOpen(false);
      } else {
        setErrorMsg(t('catalog.failedToAddSupplier'));
        console.error('Supabase insert error:', error);
      }
      setLoading(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  // Check for duplicate description as user types
  useEffect(() => {
    if (!modalOpen || !(newItem.description || "").trim()) {
      setDuplicate(false);
      return;
    }
    let active = true;
    setCheckingDuplicate(true);
    const check = setTimeout(async () => {
      const { data } = await supabase
        .from('catalog')
        .select('id')
        .ilike('description', (newItem.description || "").trim());
      if (active) {
        setDuplicate(!!(data && data.length));
        setCheckingDuplicate(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(check);
    };
  }, [newItem.description, modalOpen]);

  // Helper to get unique suggestions
  function getSuggestions(list: CatalogItem[], field: keyof CatalogItem, value: string) {
    if (!value) return [];
    const lower = value.toLowerCase();
    return Array.from(new Set(list
      .map(item => item[field])
      .filter(val => val && val.toLowerCase().includes(lower))
    ));
  }

  const classSuggestions = useMemo(() => getSuggestions(catalog, 'classification', newItem.classification || ''), [catalog, newItem.classification]);
  const descSuggestions = useMemo(() => getSuggestions(catalog, 'description', newItem.description || ''), [catalog, newItem.description]);

  if (loading) return <div className="p-8 text-center">{t('catalog.loading')}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-bold">
              {activeTab === 'materials' ? t('catalog.title') : t('catalog.supplierTitle')}
            </CardTitle>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('materials')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'materials'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('catalog.materials')}
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('catalog.suppliers')}
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center w-full md:w-auto">
            <Input
              placeholder={activeTab === 'materials' ? t('catalog.searchMaterials') : t('catalog.searchSuppliers')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full md:w-64"
            />
            {activeTab === 'materials' && (
              <Select value={classificationFilter} onValueChange={val => { setClassificationFilter(val); setPage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('catalog.allClassifications')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('catalog.allClassifications')}</SelectItem>
                  {classifications.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setModalOpen(true)} className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'materials' ? t('catalog.addMaterial') : t('catalog.addSupplier')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {activeTab === 'materials' ? (
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("classification")}>{t('catalog.classification')} {sortBy === "classification" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("description")}>{t('catalog.description')} {sortBy === "description" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("unit")}>{t('catalog.unit')} {sortBy === "unit" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("created_at")}>{t('catalog.createdOn')} {sortBy === "created_at" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("created_by")}>{t('catalog.createdBy')} {sortBy === "created_by" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("name")}>{t('catalog.name')} {sortBy === "name" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("rfc")}>{t('catalog.rfc')} {sortBy === "rfc" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("created_at")}>{t('catalog.createdOn')} {sortBy === "created_at" && (sortDir === "asc" ? "▲" : "▼")}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort("created_by")}>{t('catalog.createdBy')} {sortBy === "created_by" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activeTab === 'materials' ? (
                  // Material rows
                  <>
                    {paginated.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.classification}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.created_by || '-'}</td>
                      </tr>
                    ))}
                    {/* Add empty rows to keep table height consistent */}
                    {Array.from({ length: Math.max(0, PAGE_SIZE - paginated.length) }).map((_, idx) => (
                      <tr key={"empty-" + idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                      </tr>
                    ))}
                    {adding && (
                      <tr>
                        <td className="px-4 py-2">
                          <Input
                            value={newItem.classification}
                            onChange={e => setNewItem({ ...newItem, classification: e.target.value })}
                            placeholder={t('catalog.classification')}
                            className="w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={newItem.description}
                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder={t('catalog.description')}
                            className="w-full"
                          />
                        </td>
                        <td className="px-4 py-2 flex gap-2 items-center">
                          <Input
                            value={newItem.unit}
                            onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                            placeholder={t('catalog.unit')}
                            className="w-full"
                          />
                          <Button size="sm" onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white">{t('catalog.save')}</Button>
                          <Button size="sm" variant="outline" onClick={() => setAdding(false)}>{t('catalog.cancel')}</Button>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">-</td>
                      </tr>
                    )}
                  </>
                ) : (
                  // Supplier rows
                  <>
                    {paginated.map((supplier, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{supplier.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{supplier.rfc}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{supplier.created_by || '-'}</td>
                      </tr>
                    ))}
                    {/* Add empty rows to keep table height consistent */}
                    {Array.from({ length: Math.max(0, PAGE_SIZE - paginated.length) }).map((_, idx) => (
                      <tr key={"empty-" + idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">&nbsp;</td>
                      </tr>
                    ))}
                  </>
                )}
                {paginated.length === 0 && !adding && (
                  <tr>
                    <td colSpan={activeTab === 'materials' ? 5 : 4} className="text-center py-8 text-gray-400">
                      {activeTab === 'materials' ? t('catalog.noMaterialsFound') : t('catalog.noSuppliersFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-4 px-2 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <span className="text-sm text-gray-600">
              {t('catalog.showing')} {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} {t('catalog.to')} {Math.min(page * PAGE_SIZE, filtered.length)} {t('catalog.of')} {filtered.length} {t('catalog.results')}
            </span>
            <div className="flex-1 flex items-center justify-center gap-4">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                &lt;
              </Button>
              <span className="text-sm font-medium">{t('catalog.page')} {page} {t('catalog.of')} {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
                &gt;
              </Button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem("goto") as HTMLInputElement;
                const val = Number(input.value);
                if (val >= 1 && val <= totalPages) setPage(val);
              }}
              className="flex items-center gap-2"
            >
              <span className="text-sm">{t('catalog.goToPage')}</span>
              <input
                name="goto"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page}
                className="w-14 px-2 py-1 border rounded text-sm"
                style={{ minWidth: 0 }}
              />
              <Button size="sm" type="submit" variant="outline">{t('catalog.go')}</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Add Material/Supplier Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTab === 'materials' ? t('catalog.addMaterialTitle') : t('catalog.addSupplierTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {activeTab === 'materials' ? (
              // Material fields
              <>
                {/* Classification input with suggestions */}
                <div className="relative">
                  <Input
                    value={newItem.classification}
                    onChange={e => { setNewItem({ ...newItem, classification: e.target.value }); setShowClassSuggestions(true); }}
                    onFocus={() => setShowClassSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClassSuggestions(false), 100)}
                    placeholder={t('catalog.classification')}
                    autoComplete="off"
                  />
                  {showClassSuggestions && classSuggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-auto shadow">
                      {classSuggestions.map((s, i) => (
                        <li key={i} className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { setNewItem({ ...newItem, classification: s }); setShowClassSuggestions(false); }}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Description input with suggestions */}
                <div className="relative">
                  <Input
                    value={newItem.description}
                    onChange={e => { setNewItem({ ...newItem, description: e.target.value }); setShowDescSuggestions(true); }}
                    onFocus={() => setShowDescSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDescSuggestions(false), 100)}
                    placeholder={t('catalog.description')}
                    autoComplete="off"
                  />
                  {showDescSuggestions && descSuggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-auto shadow">
                      {descSuggestions.map((s, i) => (
                        <li key={i} className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { setNewItem({ ...newItem, description: s }); setShowDescSuggestions(false); }}>{s}</li>
                      ))}
                    </ul>
                  )}
                  {typeof newItem.description === 'string' && newItem.description.length > 0 && (
                    checkingDuplicate ? (
                      <span className="text-xs text-gray-500">{t('catalog.checkingDuplicates')}</span>
                    ) : duplicate ? (
                      <span className="text-xs text-red-600">{t('catalog.duplicateDescription')}</span>
                    ) : null
                  )}
                </div>
                {/* Unit input (no suggestions) */}
                <Input
                  value={newItem.unit}
                  onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder={t('catalog.unit')}
                />
              </>
            ) : (
              // Supplier fields
              <>
                <Input
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder={t('catalog.supplierName')}
                  autoComplete="off"
                />
                <Input
                  value={newSupplier.rfc}
                  onChange={e => setNewSupplier({ ...newSupplier, rfc: e.target.value })}
                  placeholder={t('catalog.supplierRfc')}
                  autoComplete="off"
                  maxLength={12}
                />
              </>
            )}
            {errorMsg && <div className="text-red-600 text-sm mb-2">{errorMsg}</div>}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAdd} 
              className="bg-green-600 hover:bg-green-700 text-white" 
              disabled={
                activeTab === 'materials' 
                  ? (duplicate || checkingDuplicate || !newItem.classification || !newItem.description || !newItem.unit)
                  : (!newSupplier.name || !newSupplier.rfc || newSupplier.rfc.length !== 12)
              }
            >
              {t('catalog.save')}
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('catalog.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <ProtectedRoute>
      <CatalogPageContent />
    </ProtectedRoute>
  );
} 