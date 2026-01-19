import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { EmbedConfigs } from "@/components/editor/plugins/embeds/auto-embed-plugin"
import { useInsertPopover } from "@/components/editor/plugins/toolbar/block-insert-plugin"

export function InsertEmbeds() {
  const { activeEditor } = useToolbarContext()
  const { close } = useInsertPopover()

  return EmbedConfigs.map((embedConfig) => (
    <button
      key={embedConfig.type}
      onClick={() => {
        activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type)
        close()
        activeEditor.focus()
      }}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
    >
      {embedConfig.icon}
      <span>{embedConfig.contentName}</span>
    </button>
  ))
}
