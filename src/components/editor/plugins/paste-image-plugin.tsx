"use client"

import { useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { isMimeType, mediaFileReader } from "@lexical/utils"
import { COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from "lexical"

import { INSERT_IMAGE_COMMAND } from "@/components/editor/plugins/images-plugin"

const ACCEPTABLE_IMAGE_TYPES = [
  "image/",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/webp",
]

export function PasteImagePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) {
          return false
        }

        const files = Array.from(clipboardData.files || [])
        if (files.length === 0) {
          return false
        }

        const imageFiles = files.filter((file) =>
          isMimeType(file, ACCEPTABLE_IMAGE_TYPES)
        )
        if (imageFiles.length === 0) {
          return false
        }

        event.preventDefault()
        void (async () => {
          try {
            const filesResult = await mediaFileReader(
              imageFiles,
              [ACCEPTABLE_IMAGE_TYPES].flatMap((x) => x)
            )
            let index = 0
            for (const { file, result } of filesResult) {
              if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
                index += 1
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                  altText: file.name || `Pasted image ${index}`,
                  src: result,
                })
              }
            }
          } catch (error) {
            console.error("Failed to paste image:", error)
          }
        })()

        return true
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])

  return null
}
