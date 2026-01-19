import { createHeadlessEditor } from '@lexical/headless';
import { $convertToMarkdownString } from '@lexical/markdown';
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import { SerializedEditorState } from 'lexical';

// Import the same nodes used in the main editor
import { nodes } from '@/components/blocks/editor-x/nodes';

// Import custom transformers
import { EMOJI } from '@/components/editor/transformers/markdown-emoji-transformer';
import { HR } from '@/components/editor/transformers/markdown-hr-transformer';
import { IMAGE } from '@/components/editor/transformers/markdown-image-transformer';
import { TABLE } from '@/components/editor/transformers/markdown-table-transformer';
import { TWEET } from '@/components/editor/transformers/markdown-tweet-transformer';

// Combined transformers matching the main editor
const TRANSFORMERS = [
  TABLE,
  HR,
  IMAGE,
  EMOJI,
  TWEET,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];

/**
 * Convert Lexical serialized editor state to Markdown string
 */
export function lexicalToMarkdown(editorState: SerializedEditorState): string {
  // Create a headless editor with the same configuration
  const editor = createHeadlessEditor({
    namespace: 'MarkdownExport',
    nodes,
    onError: (error) => {
      console.error('Headless editor error:', error);
    },
  });

  // Parse the serialized state
  const state = editor.parseEditorState(JSON.stringify(editorState));

  // Convert to markdown
  let markdown = '';
  state.read(() => {
    markdown = $convertToMarkdownString(TRANSFORMERS);
  });

  return markdown;
}

/**
 * Simple fallback: extract plain text from Lexical state
 * Used when markdown conversion fails
 */
export function extractPlainText(editorState: SerializedEditorState): string {
  try {
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('\n');
      }
      return '';
    };
    return extractText(editorState.root).trim();
  } catch {
    return '';
  }
}
