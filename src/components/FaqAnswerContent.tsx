"use client";

import React, { useMemo } from "react";
import DOMPurify from "dompurify";

interface FaqAnswerContentProps {
  content: string;
  className?: string;
}

/**
 * Komponen render konten jawaban FAQ.
 * - Mendukung format kaya (HTML TipTap) dengan sanitasi DOMPurify ketat.
 * - Tetap 100% kompatibel dengan FAQ lama yang berupa teks biasa (line break '\n' dan bullet '•').
 */
export function FaqAnswerContent({ content, className = "" }: FaqAnswerContentProps) {
  const isHtml = useMemo(() => {
    if (!content) return false;
    return /<[a-z][\s\S]*>/i.test(content);
  }, [content]);

  // Jika berupa HTML, sanitasi sebelum dimasukkan ke dangerouslySetInnerHTML
  const cleanHtml = useMemo(() => {
    if (!isHtml) return "";
    if (typeof window === "undefined") {
      // Server-side fallback: strip script and dangerous tags jika di-render di SSR
      return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "strike",
        "h2",
        "h3",
        "h4",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "code",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "title", "class"],
      ADD_ATTR: ["target", "rel"],
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    });
  }, [content, isHtml]);

  // Jika konten berupa teks biasa (format legacy), render dengan whitespace-pre-line
  if (!isHtml) {
    return (
      <div className={`whitespace-pre-line leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`faq-rich-content leading-relaxed text-inherit [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h2]:text-[14.5px] [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-[13.5px] [&_h3]:font-bold [&_h3]:my-1.5 [&_a]:text-[#356E3B] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#2A582F] [&_blockquote]:border-l-3 [&_blockquote]:border-[#356E3B]/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:text-gray-800 [&_code]:text-[11.5px] ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

export default FaqAnswerContent;
