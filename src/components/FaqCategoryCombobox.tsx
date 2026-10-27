"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, Check, ChevronDown, X, Tag } from "lucide-react";

interface FaqCategoryComboboxProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Combobox Kategori FAQ & SOP dengan fitur:
 * - Pencarian kategori yang sudah ada
 * - Aksi penambahan kategori kustom baru
 * - Pencegahan duplikasi akibat perbedaan spasi atau kapitalisasi (case-insensitive)
 */
export function FaqCategoryCombobox({
  categories,
  selectedCategory,
  onSelectCategory,
  placeholder = "Pilih atau cari kategori...",
  className = "",
}: FaqCategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter daftar kategori yang ada berdasarkan kata pencarian
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const cleanSearch = searchTerm.trim().toLowerCase();
    return categories.filter((c) => c.toLowerCase().includes(cleanSearch));
  }, [categories, searchTerm]);

  // Cek apakah term yang diketik sudah sama persis (case-insensitive) dengan salah satu kategori yang ada
  const exactMatch = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return null;
    return categories.find((c) => c.toLowerCase() === cleanSearch) || null;
  }, [categories, searchTerm]);

  const canAddNew = Boolean(searchTerm.trim() && !exactMatch);

  const handleSelect = (category: string) => {
    onSelectCategory(category);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleAddNew = () => {
    if (!searchTerm.trim()) return;
    if (exactMatch) {
      // Jika ternyata sudah ada (misal beda kapitalisasi), pilih yang existing
      handleSelect(exactMatch);
      return;
    }
    // Format huruf awal kapital untuk kerapian
    const clean = searchTerm.trim();
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    handleSelect(formatted);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Tombol Pemicu Combobox */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] transition-all cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 truncate">
          <Tag className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
          <span className={selectedCategory ? "text-gray-900 font-semibold" : "text-gray-400"}>
            {selectedCategory || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-[0_12px_30px_-8px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Kolom Pencarian */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 ml-1 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari atau ketik nama kategori..."
              autoFocus
              className="w-full bg-transparent text-xs text-gray-800 focus:outline-none placeholder:text-gray-400 py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Opsi Tambah Kategori Baru jika belum ada */}
          {canAddNew && (
            <div className="p-1.5 border-b border-gray-100 bg-emerald-50/50">
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#1E4738] hover:bg-emerald-100/70 transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
                <span className="truncate">
                  Tambah Kategori Baru: <strong className="text-[#356E3B]">&ldquo;{searchTerm.trim()}&rdquo;</strong>
                </span>
              </button>
            </div>
          )}

          {/* Daftar Kategori Yang Tersedia */}
          <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredCategories.length === 0 && !canAddNew ? (
              <div className="py-4 text-center text-xs text-gray-400 font-medium">
                Tidak ada kategori yang cocok.
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = cat.toLowerCase() === selectedCategory.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-[#EEF5F0] text-[#1E4738] font-bold"
                        : "text-gray-700 hover:bg-gray-100/80 font-medium"
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FaqCategoryCombobox;
