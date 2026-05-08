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

  const getToolbarButtonClass = (active: boolean) => {
    return `rounded px-2 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-800'
    }`;
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      {!readOnly && (
        <div className="flex flex-wrap gap-2 bg-gray-50 p-2">
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('bold'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleBold().run())}
          >
            Bold
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('italic'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleItalic().run())}
          >
            Italic
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('underline'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleUnderline().run())}
          >
            Underline
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('strike'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleStrike().run())}
          >
            Strike
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('heading', { level: 2 }))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
          >
            H2
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('bulletList'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleBulletList().run())}
          >
            Bullet
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('orderedList'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleOrderedList().run())}
          >
            Numbered
          </button>
          <button
            type="button"
            className={getToolbarButtonClass(!!editor?.isActive('blockquote'))}
            disabled={!editor}
            onMouseDown={runToolbarCommand(() => editor?.chain().focus().toggleBlockquote().run())}
          >
            Quote
          </button>
        </div>
      )}

      <div className="p-3">
        <EditorContent
          editor={editor}
          className="max-w-full prose prose-sm focus:outline-none"
          style={{ minHeight: '8rem', padding: '0.5rem' }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
