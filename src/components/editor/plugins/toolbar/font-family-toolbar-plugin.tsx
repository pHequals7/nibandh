"use client"

import { useCallback, useState } from "react"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection"
import { $getSelection, $isRangeSelection, BaseSelection } from "lexical"
import { CheckIcon, ChevronDownIcon, TypeIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@/components/editor/editor-hooks/use-update-toolbar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const FONT_FAMILY_OPTIONS = [
  "Arial",
  "Verdana",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Trebuchet MS",
]

export function FontFamilyToolbarPlugin() {
  const style = "font-family"
  const [fontFamily, setFontFamily] = useState("Arial")
  const [open, setOpen] = useState(false)

  const { activeEditor } = useToolbarContext()

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      setFontFamily(
        $getSelectionStyleValueForProperty(selection, "font-family", "Arial")
      )
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  const handleSelect = useCallback(
    (option: string) => {
      setFontFamily(option)
      activeEditor.update(() => {
        const selection = $getSelection()
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          })
        }
      })
      setOpen(false)
      activeEditor.focus()
    },
    [activeEditor, style]
  )

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-min gap-1 px-2"
          aria-label="Font family"
        >
          <TypeIcon className="size-4" />
          <span style={{ fontFamily }}>{fontFamily}</span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="flex flex-col">
          {FONT_FAMILY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-left",
                fontFamily === option && "bg-zinc-100 dark:bg-zinc-800"
              )}
              style={{ fontFamily: option }}
            >
              <span className="w-4">
                {fontFamily === option && <CheckIcon className="size-4" />}
              </span>
              {option}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
