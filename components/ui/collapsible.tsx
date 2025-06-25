"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
} | null>(null)

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open = false, onOpenChange, children, className }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(open)
    
    const isOpen = open !== undefined ? open : internalOpen
    const handleOpenChange = onOpenChange || setInternalOpen

    return (
      <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
        <div ref={ref} className={cn(className)}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ asChild, children, className, onClick }, ref) => {
    const context = React.useContext(CollapsibleContext)
    
    if (!context) {
      throw new Error("CollapsibleTrigger must be used within a Collapsible")
    }

    const handleClick = () => {
      context.onOpenChange(!context.open)
      onClick?.()
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        ref,
        onClick: handleClick,
        className: cn(className, children.props.className),
      })
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(className)}
      >
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className }, ref) => {
    const context = React.useContext(CollapsibleContext)
    
    if (!context) {
      throw new Error("CollapsibleContent must be used within a Collapsible")
    }

    if (!context.open) {
      return null
    }

    return (
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }