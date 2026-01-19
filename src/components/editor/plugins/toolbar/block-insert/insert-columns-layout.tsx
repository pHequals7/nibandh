"use client"

import { Columns3Icon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { InsertLayoutDialog } from "@/components/editor/plugins/layout-plugin"
import { useInsertPopover } from "@/components/editor/plugins/toolbar/block-insert-plugin"

export function InsertColumnsLayout() {
  const { activeEditor, showModal } = useToolbarContext()
  const { close } = useInsertPopover()

  return (
    <button
      onClick={() => {
        close()
        showModal("Insert Columns Layout", (onClose) => (
          <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
    >
      <Columns3Icon className="size-4" />
      <span>Columns Layout</span>
    </button>
  )
}
