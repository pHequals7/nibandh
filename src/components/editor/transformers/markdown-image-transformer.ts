import { TextMatchTransformer } from "@lexical/markdown"
import { $getRoot } from "lexical"

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
} from "@/components/editor/nodes/image-node"

export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null
    }

    const captionEditor = (node as any).__caption
    const showCaption = Boolean((node as any).__showCaption)
    let captionText = ""
    if (captionEditor?.getEditorState) {
      captionText = captionEditor
        .getEditorState()
        .read(() => $getRoot().getTextContent().trim())
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;")

    const alt = escapeHtml(node.getAltText())
    const src = escapeHtml(node.getSrc())

    if (showCaption && captionText) {
      const caption = escapeHtml(captionText)
      return `<figure><img src="${src}" alt="${alt}" /><figcaption>${caption}</figcaption></figure>`
    }

    return `![${alt}](${src})`
  },
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match
    const imageNode = $createImageNode({
      altText,
      maxWidth: 800,
      src,
    })
    textNode.replace(imageNode)
  },
  trigger: ")",
  type: "text-match",
}
