"use client"

import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode"
import { MinusIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { useInsertPopover } from "@/components/editor/plugins/toolbar/block-insert-plugin"

export function InsertHorizontalRule() {
  const { activeEditor } = useToolbarContext()
  const { close } = useInsertPopover()

  return (
    <button
      onClick={() => {
        activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
        close()
        activeEditor.focus()
      }}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
    >
      <MinusIcon className="size-4" />
      <span>Horizontal Rule</span>
    </button>
  )
}
