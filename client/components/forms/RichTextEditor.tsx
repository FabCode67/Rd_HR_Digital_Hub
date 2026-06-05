'use client';

import React, { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text here...',
  readOnly = false,
}) => {
  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: true }),
        Placeholder.configure({ placeholder }),
        Underline,
      ],
      content: value || '',
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onChange(html);
      },
    },
    [readOnly]
  );

  // Keep editor content in sync when `value` changes externally
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  const runToolbarCommand = (command: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!editor || readOnly) return;
    command();
  };

  const getToolbarButtonClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`;

  const toolbarButtons = [
    { label: 'Bold',     cmd: () => editor?.chain().focus().toggleBold().run(),               mark: 'bold' },
    { label: 'Italic',   cmd: () => editor?.chain().focus().toggleItalic().run(),             mark: 'italic' },
    { label: 'Underline',cmd: () => editor?.chain().focus().toggleUnderline().run(),          mark: 'underline' },
    { label: 'Strike',   cmd: () => editor?.chain().focus().toggleStrike().run(),             mark: 'strike' },
    { label: 'H2',       cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), mark: 'heading', attrs: { level: 2 } as Record<string, unknown> },
    { label: 'Bullet',   cmd: () => editor?.chain().focus().toggleBulletList().run(),         mark: 'bulletList' },
    { label: 'Numbered', cmd: () => editor?.chain().focus().toggleOrderedList().run(),        mark: 'orderedList' },
    { label: 'Quote',    cmd: () => editor?.chain().focus().toggleBlockquote().run(),         mark: 'blockquote' },
  ];

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
      {!readOnly && (
        <div className="flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-2 rounded-t-md">
          {toolbarButtons.map(({ label, cmd, mark, attrs }) => (
            <button
              key={label}
              type="button"
              disabled={!editor}
              className={getToolbarButtonClass(!!editor?.isActive(mark, attrs))}
              onMouseDown={runToolbarCommand(cmd)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="p-3">
        <EditorContent
          editor={editor}
          className="max-w-full prose prose-sm dark:prose-invert focus:outline-none
            [&_.ProseMirror]:text-gray-900 [&_.ProseMirror]:dark:text-gray-100
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:dark:text-gray-500"
          style={{ minHeight: '8rem' }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
