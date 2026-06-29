"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  CENTER_LINE_PREFIX,
  stripBlockStylePrefix,
  stripCenterPrefix,
} from "@/lib/template-markup";

const fieldClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export type TemplateBodyEditorHandle = {
  insertSnippet: (snippet: string) => void;
};

type TemplateBodyEditorProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
};

function updateTextareaValue(
  textarea: HTMLTextAreaElement,
  next: string,
  selectionStart: number,
  selectionEnd: number
) {
  textarea.value = next;
  textarea.setSelectionRange(selectionStart, selectionEnd);
  textarea.focus();
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string): string {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const selected = textarea.value.slice(start, end);
  const next = `${textarea.value.slice(0, start)}${before}${selected}${after}${textarea.value.slice(end)}`;
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  updateTextareaValue(textarea, next, cursorStart, cursorEnd);
  return next;
}

function applyLinePrefix(line: string, prefix: string): string {
  if (line.length === 0) return line;

  const { align, rest } = stripCenterPrefix(line);
  const centered = align === "center";
  const { prefix: existingPrefix, rest: body } = stripBlockStylePrefix(rest);

  if (existingPrefix === prefix) {
    const nextBody = body;
    if (!nextBody && !centered) return line;
    return `${centered ? CENTER_LINE_PREFIX : ""}${nextBody}`;
  }

  return `${centered ? CENTER_LINE_PREFIX : ""}${prefix}${body}`;
}

function toggleCenterPrefix(line: string): string {
  if (line.length === 0) return CENTER_LINE_PREFIX;
  const { align, rest } = stripCenterPrefix(line);
  if (align === "center") return rest;
  return `${CENTER_LINE_PREFIX}${line}`;
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string, mode: "block" | "center"): string {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const selected = textarea.value.slice(start, end);
  const after = textarea.value.slice(end);

  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEndOffset = selected.length;
  const block = textarea.value.slice(lineStart, start + lineEndOffset);
  const prefixed = block
    .split("\n")
    .map((line) =>
      mode === "center" ? toggleCenterPrefix(line) : applyLinePrefix(line, prefix)
    )
    .join("\n");

  const next = `${textarea.value.slice(0, lineStart)}${prefixed}${after}`;
  updateTextareaValue(textarea, next, lineStart, lineStart + prefixed.length);
  return next;
}

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

export const TemplateBodyEditor = forwardRef<TemplateBodyEditorHandle, TemplateBodyEditorProps>(
  function TemplateBodyEditor(
    { value, onChange, name = "body", required, rows = 12, placeholder },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      insertSnippet(snippet: string) {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        const next = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(end)}`;
        const cursor = start + snippet.length;
        updateTextareaValue(textarea, next, cursor, cursor);
        onChange(next);
      },
    }));

    function applyTransform(transform: (textarea: HTMLTextAreaElement) => string) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const next = transform(textarea);
      onChange(next);
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <ToolbarButton label="Title" onClick={() => applyTransform((ta) => prefixLines(ta, "! ", "block"))} />
          <ToolbarButton label="H1" onClick={() => applyTransform((ta) => prefixLines(ta, "# ", "block"))} />
          <ToolbarButton label="H2" onClick={() => applyTransform((ta) => prefixLines(ta, "## ", "block"))} />
          <ToolbarButton label="H3" onClick={() => applyTransform((ta) => prefixLines(ta, "### ", "block"))} />
          <ToolbarButton label="Bullet" onClick={() => applyTransform((ta) => prefixLines(ta, "- ", "block"))} />
          <ToolbarButton label="Center" onClick={() => applyTransform((ta) => prefixLines(ta, "", "center"))} />
          <ToolbarButton
            label="Bold"
            onClick={() => applyTransform((ta) => wrapSelection(ta, "**", "**"))}
          />
          <ToolbarButton
            label="Small"
            onClick={() => applyTransform((ta) => wrapSelection(ta, "{small}", "{/small}"))}
          />
          <ToolbarButton
            label="Large"
            onClick={() => applyTransform((ta) => wrapSelection(ta, "{large}", "{/large}"))}
          />
        </div>

        <button
          type="button"
          onClick={() => setHelpOpen((open) => !open)}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          {helpOpen ? "Hide formatting help" : "Show formatting help"}
        </button>

        {helpOpen && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ul className="space-y-1">
              <li>
                <code>! Title</code> — document title (22pt)
              </li>
              <li>
                <code># Heading</code> — large heading (18pt)
              </li>
              <li>
                <code>## Section</code> — section heading (14pt)
              </li>
              <li>
                <code>### Subsection</code> — smaller heading (12pt)
              </li>
              <li>
                <code>- Item</code> — bullet list
              </li>
              <li>
                <code>&gt;&gt; Centered text</code> — centered line (combine with styles below)
              </li>
              <li>
                <code>&gt;&gt; ! Title</code> — centered document title (22pt)
              </li>
              <li>
                <code>&gt;&gt; # Heading</code> — centered heading (18pt)
              </li>
              <li>
                <code>&gt;&gt; - Item</code> — centered bullet line
              </li>
              <li>
                <code>**bold**</code> — bold text
              </li>
              <li>
                <code>{"{small}text{/small}"}</code> — smaller text
              </li>
              <li>
                <code>{"{large}text{/large}"}</code> — larger text
              </li>
            </ul>
          </div>
        )}

        <textarea
          ref={textareaRef}
          name={name}
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClassName} font-mono`}
          placeholder={placeholder}
        />
      </div>
    );
  }
);
