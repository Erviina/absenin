"use client";

import React, { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Link2Off,
  Pilcrow,
  Undo2,
  Redo2,
} from "lucide-react";

interface FaqRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Normalisasi data FAQ lama (plain text dengan newline atau bullet '•')
 * menjadi struktur HTML yang dipahami TipTap tanpa merusak teks asli.
 */
export function normalizeFaqContentToHtml(raw: string): string {
  if (!raw) return "";

  // Jika sudah berupa HTML (hasil TipTap sebelumnya)
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }

  const lines = raw.split(/\r?\n/);
  let html = "";
  let inBullet = false;
  let inNumbered = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inBullet) {
        html += "</ul>";
        inBullet = false;
      }
      if (inNumbered) {
        html += "</ol>";
        inNumbered = false;
      }
      continue;
    }

    // Cek bullet list (diawali •, -, *)
    if (/^[•\-\*]\s+/.test(line)) {
      if (inNumbered) {
        html += "</ol>";
        inNumbered = false;
      }
      if (!inBullet) {
        html += "<ul>";
        inBullet = true;
      }
      const itemText = line.replace(/^[•\-\*]\s+/, "").trim();
      html += `<li><p>${escapeHtml(itemText)}</p></li>`;
    } 
    // Cek numbered list (diawali digit + . atau ))
    else if (/^\d+[\.\)]\s+/.test(line)) {
      if (inBullet) {
        html += "</ul>";
        inBullet = false;
      }
      if (!inNumbered) {
        html += "<ol>";
        inNumbered = true;
      }
      const itemText = line.replace(/^\d+[\.\)]\s+/, "").trim();
      html += `<li><p>${escapeHtml(itemText)}</p></li>`;
    } 
    // Paragraf biasa
    else {
      if (inBullet) {
        html += "</ul>";
        inBullet = false;
      }
      if (inNumbered) {
        html += "</ol>";
        inNumbered = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  if (inBullet) html += "</ul>";
  if (inNumbered) html += "</ol>";

  return html || `<p>${escapeHtml(raw)}</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function FaqRichEditor({
  value,
  onChange,
  placeholder = "Tuliskan jawaban atau panduan operasional di sini...",
  disabled = false,
}: FaqRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: "text-[#356E3B] underline underline-offset-2",
        },
      }),
    ],
    content: normalizeFaqContentToHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[140px] px-3.5 py-3 text-[12.5px] leading-relaxed text-gray-800",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isEmpty) {
        onChange("");
      } else {
        onChange(editor.getHTML());
      }
    },
  });

  // Sinkronisasi saat value luar berubah (misal form switch FAQ atau reset)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const normalizedNew = normalizeFaqContentToHtml(value);
    
    // Perbarui hanya jika konten berbeda secara substansial
    if (value === "" && !editor.isEmpty) {
      editor.commands.setContent("");
    } else if (value && currentHtml !== normalizedNew && currentHtml !== value) {
      editor.commands.setContent(normalizedNew);
    }
  }, [value, editor]);

  // Handle update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // Handler menambahkan tautan
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Masukkan URL tautan (http/https):", previousUrl);

    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const validUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: validUrl }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="w-full h-36 bg-gray-50 border border-gray-200 rounded-xl animate-pulse flex items-center justify-center text-xs text-gray-400">
        Memuat editor TipTap...
      </div>
    );
  }

  const isLinkActive = editor.isActive("link");

  return (
    <div className="w-full border border-gray-200 rounded-2xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#356E3B]/20 focus-within:border-[#356E3B] transition-all">
      {/* Toolbar Sederhana TipTap */}
      <div className="flex items-center gap-1 p-1.5 bg-gray-50/80 border-b border-gray-100 flex-wrap select-none">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          title="Tebal (Ctrl+B)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("bold")
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          title="Miring (Ctrl+I)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("italic")
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        {/* Heading 2 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Judul Bab (H2)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("heading", { level: 2 })
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Sub Judul (H3)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("heading", { level: 3 })
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        {/* Paragraf Biasa */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Paragraf Teks"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("paragraph") && !editor.isActive("heading")
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <Pilcrow className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Daftar Poin (Bullet List)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("bulletList")
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Daftar Nomor (Numbered List)"
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            editor.isActive("orderedList")
              ? "bg-[#EEF5F0] text-[#1E4738] shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        {/* Link / Unlink */}
        <button
          type="button"
          onClick={setLink}
          title={isLinkActive ? "Ubah Tautan Web" : "Sisipkan Tautan Web"}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isLinkActive
              ? "bg-emerald-100 text-emerald-800 shadow-2xs"
              : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        {isLinkActive && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Hapus Tautan"
            className="p-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <Link2Off className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Undo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            title="Urungkan (Ctrl+Z)"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200/60 hover:text-gray-800 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            title="Ulangi (Ctrl+Y)"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200/60 hover:text-gray-800 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Area Konten Editor TipTap */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default FaqRichEditor;
