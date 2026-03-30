/**
 * CapturePreview — Category selection panel for bulk capture
 *   Toggle switches per category, camera save, start/cancel
 */

import React, { useState, useCallback } from 'react'
import {
  Eye, Camera, Check, Play,
  Shirt, HardHat, Glasses, Watch, Footprints, ShoppingBag,
  Shield, Paintbrush, Ear, Gem,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch }     from './ui/switch'
import { ScrollArea } from './ui/scroll-area'

// ── Icon map (re-exported for App.jsx) ──────────────────
export const CAT_ICON_MAP = {
  'Mask': HardHat, 'Arms / Gloves': Shirt, 'Pants': Shirt,
  'Bags': ShoppingBag, 'Shoes': Footprints, 'Accessories': Gem,
  'Undershirt': Shirt, 'Body Armor': Shield, 'Decals': Paintbrush,
  'Tops': Shirt, 'Hats': HardHat, 'Glasses': Glasses,
  'Ears': Ear, 'Watches': Watch, 'Bracelets': Gem,
}

// ── Default categories (dev) ────────────────────────────
const DEFAULT_CATEGORIES = [
  { key: 'comp-0',  type: 'component', id: 0,  label: 'Mask',          icon: HardHat     },
  { key: 'comp-3',  type: 'component', id: 3,  label: 'Arms / Gloves', icon: Shirt       },
  { key: 'comp-4',  type: 'component', id: 4,  label: 'Pants',         icon: Shirt       },
  { key: 'comp-5',  type: 'component', id: 5,  label: 'Bags',          icon: ShoppingBag },
  { key: 'comp-6',  type: 'component', id: 6,  label: 'Shoes',         icon: Footprints  },
  { key: 'comp-7',  type: 'component', id: 7,  label: 'Accessories',   icon: Gem         },
  { key: 'comp-8',  type: 'component', id: 8,  label: 'Undershirt',    icon: Shirt       },
  { key: 'comp-9',  type: 'component', id: 9,  label: 'Body Armor',    icon: Shield      },
  { key: 'comp-10', type: 'component', id: 10, label: 'Decals',        icon: Paintbrush  },
  { key: 'comp-11', type: 'component', id: 11, label: 'Tops',          icon: Shirt       },
  { key: 'prop-0',  type: 'prop',      id: 0,  label: 'Hats',          icon: HardHat     },
  { key: 'prop-1',  type: 'prop',      id: 1,  label: 'Glasses',       icon: Glasses     },
  { key: 'prop-2',  type: 'prop',      id: 2,  label: 'Ears',          icon: Ear         },
  { key: 'prop-6',  type: 'prop',      id: 6,  label: 'Watches',       icon: Watch       },
  { key: 'prop-7',  type: 'prop',      id: 7,  label: 'Bracelets',     icon: Gem         },
]

// ── CapturePreview ──────────────────────────────────────
export function CapturePreview({
  categories = DEFAULT_CATEGORIES,
  onStart, onCancel, onActiveChange, onSaveAngle,
}) {
  const [activeKey, setActiveKey]     = useState(categories[0]?.key ?? null)
  const [selected, setSelected]       = useState(() => new Set(categories.map(c => c.key)))
  const [savedCameras, setSavedCameras] = useState(() => new Set())

  const handleToggle = useCallback((key) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const handleRowClick = useCallback((cat) => {
    setActiveKey(cat.key)
    onActiveChange?.(cat)
  }, [onActiveChange])

  const handleSaveAngle = useCallback(() => {
    const activeCat = categories.find(c => c.key === activeKey)
    if (!activeCat?.camera) return
    onSaveAngle?.(activeCat.camera)
    setSavedCameras(prev => { const n = new Set(prev); n.add(activeCat.camera); return n })
  }, [activeKey, categories, onSaveAngle])

  const handleStart = useCallback(() => {
    if (selected.size === 0) return
    onStart?.(categories.filter(c => selected.has(c.key)))
  }, [categories, selected, onStart])

  const selectAll  = useCallback(() => setSelected(new Set(categories.map(c => c.key))), [categories])
  const selectNone = useCallback(() => setSelected(new Set()), [])

  const canStart = selected.size > 0

  return (
    <div
      className="glass rounded-xl overflow-hidden animate-enter"
      style={{
        width: 360,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      {/* Inner container */}
      <div className="m-3 rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 12px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#eee', letterSpacing: '-0.02em', lineHeight: '24px', marginBottom: 4 }}>
            Capture Preview
          </h3>
          <p style={{ fontSize: 11, fontWeight: 400, color: '#666', lineHeight: '16px' }}>
            Drag to rotate · Scroll to zoom · Save per category
          </p>

          {/* Count row */}
          <div className="flex items-center justify-between" style={{ paddingTop: 10 }}>
            <span style={{ fontSize: 10, color: '#555' }}>
              <span style={{ color: '#999', fontWeight: 600 }}>{selected.size}</span> / {categories.length} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={selectAll}
                className="transition-colors hover:text-zinc-300"
                style={{ fontSize: 10, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
                All
              </button>
              <span style={{ fontSize: 10, color: '#333' }}>·</span>
              <button onClick={selectNone}
                className="transition-colors hover:text-zinc-300"
                style={{ fontSize: 10, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
                None
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* Category rows */}
        <div style={{ padding: '8px 22px 10px' }}>
          <ScrollArea style={{ height: `${Math.min(categories.length, 5) * 32}px` }}>
            <div className="flex flex-col gap-0.5">
              {categories.map((cat) => {
                const isActive = cat.key === activeKey
                const isOn     = selected.has(cat.key)
                const isSaved  = savedCameras.has(cat.camera)

                return (
                  <div
                    key={cat.key}
                    onClick={() => handleRowClick(cat)}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer select-none transition-all duration-100',
                      isActive ? 'opacity-100' : 'opacity-40 hover:opacity-65'
                    )}
                    style={{
                      height: 28,
                      padding: '0 8px',
                      borderRadius: 5,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
                      background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent',
                    }}
                  >
                    <span className="flex-1 truncate"
                      style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: '#f5f5f5' }}>
                      {cat.label}
                    </span>

                    {isSaved && <Check style={{ width: 9, height: 9, color: '#22c55e', flexShrink: 0 }} />}

                    {isActive && (
                      <div onClick={(e) => { e.stopPropagation(); handleSaveAngle() }}
                        title="Save camera angle"
                        className="flex items-center justify-center transition-colors hover:bg-white/[0.06]"
                        style={{ width: 18, height: 18, borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                        <Camera style={{ width: 10, height: 10, color: isSaved ? '#22c55e' : '#888' }} />
                      </div>
                    )}

                    <Eye style={{
                      width: 9, height: 9, color: '#f5f5f5', flexShrink: 0,
                      opacity: isActive ? 0.8 : 0.3, transition: 'opacity 0.15s',
                    }} />

                    <div onClick={e => e.stopPropagation()}>
                      <Switch size="sm" checked={isOn} onCheckedChange={() => handleToggle(cat.key)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ padding: '12px 22px 16px' }}>
          <button onClick={onCancel}
            className="transition-colors hover:bg-white/[0.03] focus-ring"
            style={{
              width: 64, height: 28, fontSize: 10, fontWeight: 500, color: '#666',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 5, cursor: 'pointer',
            }}>
            Cancel
          </button>

          {canStart && (
            <span style={{ fontSize: 10, color: '#555' }}>
              {selected.size} item{selected.size !== 1 ? 's' : ''}
            </span>
          )}

          <button onClick={handleStart} disabled={!canStart}
            className="transition-all focus-ring"
            style={{
              width: 64, height: 28, fontSize: 10, fontWeight: 700,
              background: canStart ? '#f5f5f5' : '#1a1a1a',
              color: canStart ? '#111' : '#444',
              border: `1px solid ${canStart ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 5,
              cursor: canStart ? 'pointer' : 'not-allowed',
              boxShadow: canStart ? '0 1px 8px rgba(255,255,255,0.08)' : 'none',
            }}>
            Start
          </button>
        </div>
      </div>
    </div>
  )
}

export default CapturePreview
