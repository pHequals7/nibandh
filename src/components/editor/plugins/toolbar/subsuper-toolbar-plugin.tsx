import { useState } from "react"
import { $isTableSelection } from "@lexical/table"
import { $isRangeSelection, BaseSelection, FORMAT_TEXT_COMMAND } from "lexical"
import { SubscriptIcon, SuperscriptIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@/components/editor/editor-hooks/use-update-toolbar"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export function SubSuperToolbarPlugin() {
  const { activeEditor } = useToolbarContext()
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // @ts-ignore
      setIsSubscript(selection.hasFormat("subscript"))
      // @ts-ignore
      setIsSuperscript(selection.hasFormat("superscript"))
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  const currentValue = isSubscript ? "subscript" : isSuperscript ? "superscript" : ""
  const isDark = document.documentElement.classList.contains('dark')
  const activeStyle = isDark
    ? { backgroundColor: '#4b5563', color: '#ffffff' }
    : { backgroundColor: '#d1d5db', color: '#111827' }

  return (
    <ToggleGroup
      type="single"
      value={currentValue}
    >
      <ToggleGroupItem
        value="subscript"
        size="sm"
        aria-label="Toggle subscript"
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")
        }}
        variant={"outline"}
        style={isSubscript ? activeStyle : undefined}
      >
        <SubscriptIcon className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="superscript"
        size="sm"
        aria-label="Toggle superscript"
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")
        }}
        variant={"outline"}
        style={isSuperscript ? activeStyle : undefined}
      >
        <SuperscriptIcon className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
