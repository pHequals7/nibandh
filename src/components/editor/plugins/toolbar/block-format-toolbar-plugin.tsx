import { useState, useCallback } from "react"
import { $isListNode, ListNode } from "@lexical/list"
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list"
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils"
import { $createParagraphNode, $getSelection, $isRangeSelection, $isRootOrShadowRoot, BaseSelection } from "lexical"
import { $createCodeNode } from "@lexical/code"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@/components/editor/editor-hooks/use-update-toolbar"
import { blockTypeToBlockName } from "@/components/editor/plugins/toolbar/block-format/block-format-data"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const BLOCK_FORMAT_OPTIONS = [
  "paragraph",
  "h1",
  "h2",
  "h3",
  "bullet",
  "number",
  "check",
  "quote",
  "code",
] as const

export function BlockFormatDropDown({
  children,
}: {
  children?: React.ReactNode
}) {
  const { activeEditor, blockType, setBlockType } = useToolbarContext()
  const [open, setOpen] = useState(false)

  function $updateToolbar(selection: BaseSelection) {
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && $isRootOrShadowRoot(parent)
            })

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow()
      }

      const elementKey = element.getKey()
      const elementDOM = activeEditor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode
          )
          const type = parentList
            ? parentList.getListType()
            : element.getListType()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType()
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName)
          }
        }
      }
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  const formatBlock = useCallback((type: string) => {
    activeEditor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      switch (type) {
        case "paragraph":
          $setBlocksType(selection, () => $createParagraphNode())
          break
        case "h1":
        case "h2":
        case "h3":
          $setBlocksType(selection, () => $createHeadingNode(type))
          break
        case "bullet":
          activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
          break
        case "number":
          activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
          break
        case "check":
          activeEditor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
          break
        case "quote":
          $setBlocksType(selection, () => $createQuoteNode())
          break
        case "code":
          $setBlocksType(selection, () => $createCodeNode())
          break
      }
    })
    setBlockType(type)
    setOpen(false)
    activeEditor.focus()
  }, [activeEditor, setBlockType])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-min gap-1 px-2"
          aria-label="Block format"
        >
          {blockTypeToBlockName[blockType]?.icon}
          <span>{blockTypeToBlockName[blockType]?.label}</span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="flex flex-col">
          {BLOCK_FORMAT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => formatBlock(option)}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left",
                blockType === option && "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              <span className="w-4">
                {blockType === option && <CheckIcon className="size-4" />}
              </span>
              {blockTypeToBlockName[option]?.icon}
              {blockTypeToBlockName[option]?.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
