'use client'

import React, { useState, useCallback, useRef } from 'react'
import { DropdownMenu as OriginalDropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "app/components/ui/dropdown-menu"

interface ImprovedDropdownMenuProps {
    children: React.ReactNode
    trigger: React.ReactNode
  }
  
  export function ImprovedDropdownMenu({ children, trigger }: ImprovedDropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const mouseDownRef = useRef(false)
  
    const handleMouseDown = useCallback(() => {
      mouseDownRef.current = true
    }, [])
  
    const handleMouseUp = useCallback(() => {
      if (mouseDownRef.current) {
        setIsOpen(prev => !prev)
      }
      mouseDownRef.current = false
    }, [])
  
    const handleMouseLeave = useCallback(() => {
      mouseDownRef.current = false
    }, [])
  
    return (
      <OriginalDropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {trigger}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {children}
        </DropdownMenuContent>
      </OriginalDropdownMenu>
    )
  }
  
  export { DropdownMenuItem }