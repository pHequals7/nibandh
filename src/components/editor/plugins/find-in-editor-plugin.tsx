import { useCallback, useEffect, useRef, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getNodeByKey, $getRoot, $isTextNode } from "lexical"

import { Input } from "@/components/ui/input"

type Match = {
  key: string
  start: number
  end: number
}

export function FindInEditorPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<Match[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const computeMatches = useCallback(
    (searchText: string) => {
      const normalizedQuery = searchText.trim().toLowerCase()
      if (!normalizedQuery) {
        setMatches([])
        setActiveIndex(0)
        return
      }

      const nextMatches: Match[] = []
      editor.getEditorState().read(() => {
        const textNodes = $getRoot().getAllTextNodes()
        textNodes.forEach((node) => {
          const text = node.getTextContent()
          const normalizedText = text.toLowerCase()
          let index = 0
          while (index < normalizedText.length) {
            const found = normalizedText.indexOf(normalizedQuery, index)
            if (found === -1) break
            nextMatches.push({
              key: node.getKey(),
              start: found,
              end: found + normalizedQuery.length,
            })
            index = found + normalizedQuery.length
          }
        })
      })

      setMatches(nextMatches)
      setActiveIndex((current) => {
        if (nextMatches.length === 0) return 0
        return Math.min(current, nextMatches.length - 1)
      })
    },
    [editor]
  )

  useEffect(() => {
    if (!isOpen) return
    computeMatches(query)
  }, [computeMatches, isOpen, query])

  useEffect(() => {
    if (!isOpen || matches.length === 0) return
    const match = matches[activeIndex]
    if (!match) return
    editor.update(() => {
      const node = $getNodeByKey(match.key)
      if ($isTextNode(node)) {
        node.select(match.start, match.end)
      }
    })
  }, [activeIndex, editor, isOpen, matches])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isFind = (event.metaKey || event.ctrlKey) && key === "f"
      const isEscape = key === "escape"

      const root = editor.getRootElement()
      const hasEditorFocus =
        root !== null && root.contains(document.activeElement)

      if (isFind && hasEditorFocus) {
        event.preventDefault()
        setIsOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }

      if (isEscape && isOpen) {
        event.preventDefault()
        setIsOpen(false)
        setQuery("")
        setMatches([])
        return
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [editor, isOpen])

  const goNext = () => {
    if (matches.length === 0) return
    setActiveIndex((current) => (current + 1) % matches.length)
  }

  const goPrev = () => {
    if (matches.length === 0) return
    setActiveIndex((current) =>
      current - 1 < 0 ? matches.length - 1 : current - 1
    )
  }

  if (!isOpen) return null

  const countLabel =
    matches.length === 0 ? "0/0" : `${activeIndex + 1}/${matches.length}`

  return (
    <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find in draft"
        className="h-8 w-48 text-sm"
      />
      <span className="text-xs text-muted-foreground">{countLabel}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={matches.length === 0}
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={matches.length === 0}
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false)
          setQuery("")
          setMatches([])
        }}
        className="ml-1 rounded-md border border-border px-2 py-1 text-xs text-foreground"
      >
        Esc
      </button>
    </div>
  )
}
