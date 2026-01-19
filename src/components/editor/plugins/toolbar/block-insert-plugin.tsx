"use client"

import { createContext, useContext, useState } from "react"
import { ChevronDownIcon, PlusIcon } from "lucide-react"

import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Context to allow children to close the popover
const InsertPopoverContext = createContext<{ close: () => void }>({ close: () => {} })

export function useInsertPopover() {
  return useContext(InsertPopoverContext)
}

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
  const [modal] = useEditorModal()
  const [open, setOpen] = useState(false)

  return (
    <>
      {modal}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-min gap-1 px-2"
            aria-label="Insert"
          >
            <PlusIcon className="size-4" />
            <span>Insert</span>
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <InsertPopoverContext.Provider value={{ close: () => setOpen(false) }}>
            <div className="flex flex-col">
              {children}
            </div>
          </InsertPopoverContext.Provider>
        </PopoverContent>
      </Popover>
    </>
  )
}
