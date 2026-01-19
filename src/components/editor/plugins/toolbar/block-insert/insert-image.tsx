import { ImageIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { InsertImageDialog } from "@/components/editor/plugins/images-plugin"
import { useInsertPopover } from "@/components/editor/plugins/toolbar/block-insert-plugin"

export function InsertImage() {
  const { activeEditor, showModal } = useToolbarContext()
  const { close } = useInsertPopover()

  return (
    <button
      onClick={() => {
        close()
        showModal("Insert Image", (onClose) => (
          <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
    >
      <ImageIcon className="size-4" />
      <span>Image</span>
    </button>
  )
}
