'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

const ITEMS = [
  { href: '/preview/platform_foundation', label: '플랫폼 · 재단' },
  { href: '/preview/platform_org', label: '플랫폼 · 단체' },
  { href: '/preview/private_space_foundation', label: '공간활성화' },
]

export default function PreviewMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
      >
        진단지 미리보기
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {ITEMS.map(it => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
