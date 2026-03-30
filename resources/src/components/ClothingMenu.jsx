/**
 * ClothingMenu — Wardrobe HUD
 *   Left  sidebar (210px) : category navigation
 *   Right sidebar (400px) : virtualized thumbnail grid
 *   Center: transparent (character visible)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import {
  Camera, X, Search, Check, Shirt, RotateCcw,
  HardHat, Glasses, Watch, Footprints, ShoppingBag,
  Shield, Paintbrush, Ear, Gem, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from './ui/scroll-area'

// ── Constants ────────────────────────────────────────
const THUMB_BASE = 'https://cfx-nui-uz_AutoShot/shots/'
const CARD_W     = 92
const GAP        = 5

const CAT_ICONS = {
  'Mask': HardHat, 'Arms / Gloves': Shirt, 'Pants': Shirt,
  'Bags': ShoppingBag, 'Shoes': Footprints, 'Accessories': Gem,
  'Undershirt': Shirt, 'Body Armor': Shield, 'Decals': Paintbrush,
  'Tops': Shirt, 'Hats': HardHat, 'Glasses': Glasses,
  'Ears': Ear, 'Watches': Watch, 'Bracelets': Gem,
}

function CatIcon({ label, size = 11, style }) {
  const Icon = CAT_ICONS[label] || Shirt
  return <Icon style={{ width: size, height: size, flexShrink: 0, ...style }} />
}

// ── Shared styles ────────────────────────────────────
const border = (opacity = 0.06) => `1px solid rgba(255,255,255,${opacity})`
const bg     = (opacity = 0.03) => `rgba(255,255,255,${opacity})`

// ── Thumbnail Card ───────────────────────────────────
const Thumbnail = React.memo(({ item, isSelected, onClick, ext, recaptureMode, recaptureSelected }) => {
  const [src, setSrc]     = useState(null)
  const [error, setError] = useState(false)

  const texSuffix = item.texture > 0 ? `_${item.texture}` : ''
  const thumbName = item.type === 'prop'
    ? `${item.gender}/prop_${item.id}/${item.drawable}${texSuffix}.${ext}`
    : `${item.gender}/${item.id}/${item.drawable}${texSuffix}.${ext}`

  useEffect(() => {
    let cancelled = false
    setSrc(null); setError(false)
    fetch(THUMB_BASE + thumbName)
      .then(r => { if (!r.ok) throw 0; return r.blob() })
      .then(b => { if (!cancelled) setSrc(URL.createObjectURL(b)) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [thumbName])

  const active = recaptureSelected || isSelected
  const accent = recaptureSelected ? '#fb923c' : '#fff'

  return (
    <div
      className="group relative overflow-hidden cursor-pointer"
      style={{
        borderRadius: 8,
        background: active ? `${accent}06` : 'rgba(255,255,255,0.012)',
        border: `1px solid ${active ? `${accent}30` : 'rgba(255,255,255,0.04)'}`,
        transition: 'border-color 0.15s, background 0.15s',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={() => onClick(item)}
    >
      {/* Image area — fixed height via flex:1 + min-height:0 */}
      <div style={{
        position: 'relative', flex: '1 1 0', minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', background: 'rgba(0,0,0,0.15)',
      }}>
        {!src && !error && <div style={{ position: 'absolute', inset: 0 }} className="skeleton" />}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Shirt style={{ width: 16, height: 16, color: '#2a2a2a' }} />
            <span style={{ fontSize: 9, color: '#333', fontVariantNumeric: 'tabular-nums' }}>#{item.drawable}</span>
          </div>
        )}
        {src && (
          <img src={src} alt="" draggable={false}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain', padding: 5,
              transition: 'transform 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        )}

        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', opacity: 0, pointerEvents: 'none',
          transition: 'opacity 0.1s',
        }} ref={el => {
          if (!el) return
          const p = el.parentElement?.parentElement
          if (!p) return
          p.onmouseenter = () => el.style.opacity = '1'
          p.onmouseleave = () => el.style.opacity = '0'
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            #{item.drawable}
          </span>
        </div>

        {/* Badges */}
        {recaptureSelected && (
          <div style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: '#fb923c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw style={{ width: 7, height: 7, color: '#000' }} strokeWidth={3} />
          </div>
        )}
        {!recaptureMode && isSelected && (
          <div style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check style={{ width: 8, height: 8, color: '#000' }} strokeWidth={3} />
          </div>
        )}
        {item.texture > 0 && (
          <span style={{
            position: 'absolute', top: 3, left: 3,
            fontSize: 7, fontWeight: 700, color: '#777',
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 2, padding: '0 3px', fontVariantNumeric: 'tabular-nums',
          }}>
            T{item.texture}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{
        height: 18, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.025)', background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{
          fontSize: 8, fontWeight: active ? 700 : 500,
          color: active ? '#ccc' : '#444',
          fontVariantNumeric: 'tabular-nums',
        }}>
          #{item.drawable}
        </span>
      </div>
    </div>
  )
})

// ── Grid Cell ────────────────────────────────────────
function Cell({ columnIndex, rowIndex, style, data }) {
  const { filteredItems, selectedItem, onItemSelect, imgExt,
          recaptureMode, recaptureSet, toggleRecaptureItem, COLS } = data
  const idx = rowIndex * COLS + columnIndex
  if (idx >= filteredItems.length) return null
  const item = filteredItems[idx]
  const key = `${item.type}-${item.id}-${item.drawable}-${item.texture}`
  const sel = !recaptureMode && selectedItem &&
    selectedItem.type === item.type && selectedItem.id === item.id &&
    selectedItem.drawable === item.drawable && selectedItem.texture === item.texture
  return (
    <div style={{
      ...style,
      left: +style.left + GAP, top: +style.top + GAP,
      width: +style.width - GAP, height: +style.height - GAP,
    }}>
      <Thumbnail
        item={item} isSelected={sel} ext={imgExt}
        onClick={recaptureMode ? toggleRecaptureItem : onItemSelect}
        recaptureMode={recaptureMode}
        recaptureSelected={recaptureMode && recaptureSet.has(key)}
      />
    </div>
  )
}

// ── ClothingMenu ─────────────────────────────────────
export function ClothingMenu({
  categories, activeCatIdx, onCategoryChange,
  filteredItems, selectedItem, onItemSelect, imgExt,
  searchQuery, onSearchChange,
  onClose, onRecapture,
}) {
  const activeCat = categories[activeCatIdx]

  const [recaptureMode, setRecaptureMode] = useState(false)
  const [recaptureSet, setRecaptureSet]   = useState(new Set())

  const toggleRecaptureMode = useCallback(() => {
    setRecaptureMode(p => !p)
    setRecaptureSet(new Set())
  }, [])

  const toggleRecaptureItem = useCallback((item) => {
    const key = `${item.type}-${item.id}-${item.drawable}-${item.texture}`
    setRecaptureSet(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }, [])

  const handleRecaptureStart = useCallback(() => {
    if (recaptureSet.size === 0) return
    const items = Array.from(recaptureSet).map(k => {
      const p = k.split('-')
      return { type: p[0], id: +p[1], drawable: +p[2], texture: +p[3] }
    })
    onRecapture?.(items)
    setRecaptureMode(false)
    setRecaptureSet(new Set())
  }, [recaptureSet, onRecapture])

  const gridRef = useRef(null)
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const measure = () => {
      if (gridRef.current) {
        const r = gridRef.current.getBoundingClientRect()
        setGridSize({ width: r.width, height: r.height })
      }
    }
    measure()
    const t = setTimeout(measure, 50)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); clearTimeout(t) }
  }, [activeCatIdx])

  const COLS  = Math.max(1, Math.floor((gridSize.width - GAP) / (CARD_W + GAP)))
  const ROWS  = Math.ceil(filteredItems.length / COLS)
  const ROW_H = CARD_W + GAP + 18

  const itemData = useMemo(() => ({
    filteredItems, selectedItem, onItemSelect, imgExt,
    recaptureMode, recaptureSet, toggleRecaptureItem, COLS,
  }), [filteredItems, selectedItem, onItemSelect, imgExt, recaptureMode, recaptureSet, toggleRecaptureItem, COLS])

  // ── Render ─────────────────────────────────────────
  return (
    <>
      {/* ═══ LEFT SIDEBAR ═════════════════════════════ */}
      <div
        data-no-orbit
        className="fixed left-0 top-0 bottom-0 z-[9999] flex flex-col glass animate-enter"
        style={{
          width: 210,
          borderRight: border(),
          boxShadow: '6px 0 40px rgba(0,0,0,0.55)',
        }}
      >
        <div className="accent-line shrink-0" />

        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0" style={{ padding: '14px 16px 12px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: border(0.08),
          }}>
            <Camera style={{ width: 13, height: 13, color: '#777' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              AutoShot
            </p>
            <p style={{ fontSize: 9, color: '#444', lineHeight: 1.3, marginTop: 1 }}>Clothing Catalog</p>
          </div>
        </div>

        <div style={{ height: 1, background: bg(0.04), margin: '0 12px' }} />

        {/* Section label */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: '10px 16px 6px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333' }}>
            Categories
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, color: '#444',
            background: bg(0.03), border: border(0.04),
            borderRadius: 3, padding: '1px 5px', minWidth: 18, textAlign: 'center',
          }}>
            {categories.length}
          </span>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-hidden px-1.5 pb-1.5 relative">
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(8,8,10,0.95), transparent)' }} />
          <ScrollArea style={{ height: '100%' }}>
            <div className="flex flex-col pb-10" style={{ gap: 1 }}>
              {categories.map((cat, idx) => {
                const active = idx === activeCatIdx
                return (
                  <button
                    key={`${cat.type}-${cat.id}`}
                    onClick={() => onCategoryChange(idx)}
                    className={cn(
                      'flex items-center gap-2 w-full cursor-pointer select-none text-left focus-ring',
                      'transition-all duration-100'
                    )}
                    style={{
                      height: 32,
                      padding: active ? '0 8px 0 7px' : '0 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#eee' : '#666',
                      opacity: active ? 1 : 0.7,
                      background: active ? bg(0.04) : 'transparent',
                      border: active ? border(0.07) : '1px solid transparent',
                      borderLeft: active ? '2px solid #666' : '1px solid transparent',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: active ? bg(0.05) : bg(0.02),
                      border: border(active ? 0.07 : 0.03),
                    }}>
                      <CatIcon label={cat.label} size={10} style={{ color: active ? '#999' : '#444' }} />
                    </div>
                    <span className="flex-1 truncate">{cat.label}</span>
                    {active && (
                      <span style={{ fontSize: 9, color: '#444', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {cat.drawables}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <div style={{ height: 1, background: bg(0.04), margin: '0 12px' }} />

        {/* Close */}
        <div style={{ padding: '8px 10px' }}>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 cursor-pointer focus-ring"
            style={{
              height: 30, fontSize: 10, fontWeight: 500, color: '#555',
              border: border(0.05), borderRadius: 6, background: 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = bg(0.03)}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <X style={{ width: 10, height: 10 }} />
            Close
          </button>
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR ════════════════════════════ */}
      <div
        data-no-orbit
        className="fixed right-0 top-0 bottom-0 z-[9999] flex flex-col glass animate-enter"
        style={{
          width: 400,
          borderLeft: border(),
          boxShadow: '-6px 0 40px rgba(0,0,0,0.55)',
        }}
      >
        <div className="accent-line shrink-0" />

        {/* Category header */}
        <div className="flex items-center gap-3 shrink-0" style={{ padding: '12px 16px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: border(0.08),
          }}>
            <CatIcon label={activeCat?.label} size={13} style={{ color: '#777' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {activeCat?.label || '—'}
            </p>
            <p style={{ fontSize: 9, color: '#444', lineHeight: 1.3, marginTop: 1 }}>
              {activeCat?.type === 'prop' ? 'Prop' : 'Component'} · ID {activeCat?.id}
            </p>
          </div>

          {/* Count */}
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#555', fontVariantNumeric: 'tabular-nums',
            background: bg(0.03), border: border(0.05),
            borderRadius: 5, padding: '3px 9px',
          }}>
            {filteredItems.length}
          </span>

          {/* Recapture toggle */}
          <button
            onClick={toggleRecaptureMode}
            title="Re-capture thumbnails"
            className="flex items-center justify-center shrink-0 cursor-pointer focus-ring"
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: recaptureMode ? 'rgba(251,146,60,0.1)' : 'transparent',
              border: recaptureMode ? '1px solid rgba(251,146,60,0.25)' : border(0.06),
              transition: 'all 0.15s',
            }}
          >
            <RotateCcw style={{ width: 11, height: 11, color: recaptureMode ? '#fb923c' : '#444' }} />
          </button>
        </div>

        <div style={{ height: 1, background: bg(0.04) }} />

        {/* Search */}
        <div style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2"
            style={{
              height: 32, borderRadius: 7, padding: '0 10px',
              background: bg(0.015), border: border(0.04),
              transition: 'border-color 0.15s',
            }}>
            <Search style={{ width: 12, height: 12, color: '#444', flexShrink: 0 }} />
            <input
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search by name or #id..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 11, color: '#ccc', caretColor: '#888',
              }}
            />
            {searchQuery ? (
              <button onClick={() => onSearchChange('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X style={{ width: 10, height: 10, color: '#555' }} />
              </button>
            ) : (
              <span style={{ fontSize: 8, color: '#333', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                {activeCat?.drawables ?? 0}
              </span>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: bg(0.04) }} />

        {/* Grid */}
        <div className="flex-1 overflow-hidden relative" ref={gridRef}>
          {filteredItems.length > 0 && gridSize.height > 0 ? (
            <Grid
              className="scrollbar-thin"
              columnCount={COLS}
              columnWidth={CARD_W + GAP}
              height={gridSize.height}
              rowCount={ROWS}
              rowHeight={ROW_H}
              width={gridSize.width}
              overscanRowCount={3}
              itemData={itemData}
            >
              {Cell}
            </Grid>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div style={{
                width: 44, height: 44, borderRadius: 11, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: bg(0.02), border: border(0.04),
              }}>
                <Search style={{ width: 16, height: 16, color: '#2a2a2a' }} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 11, fontWeight: 500, color: '#444' }}>No items found</span>
                {searchQuery && (
                  <button onClick={() => onSearchChange('')}
                    style={{ fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={{ height: 1, background: bg(0.04) }} />

        {recaptureMode ? (
          <div className="flex items-center gap-2 shrink-0" style={{ padding: '7px 14px', background: 'rgba(251,146,60,0.03)' }}>
            <RotateCcw style={{ width: 10, height: 10, color: '#fb923c', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#888', flex: 1 }}>
              {recaptureSet.size > 0
                ? <><span style={{ color: '#fb923c', fontWeight: 700 }}>{recaptureSet.size}</span> selected</>
                : 'Select items to re-capture'}
            </span>
            {recaptureSet.size > 0 && (
              <button onClick={handleRecaptureStart}
                style={{
                  height: 22, padding: '0 10px', borderRadius: 5,
                  fontSize: 10, fontWeight: 700, color: '#000', background: '#fb923c',
                  border: 'none', cursor: 'pointer',
                }}>
                Re-capture
              </button>
            )}
            <button onClick={toggleRecaptureMode}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X style={{ width: 10, height: 10, color: '#444' }} />
            </button>
          </div>
        ) : selectedItem ? (
          <div className="flex items-center gap-2 shrink-0" style={{ padding: '8px 14px' }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.4)',
            }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#888', flex: 1 }} className="truncate">
              {selectedItem.label}
            </span>
            <span style={{
              fontSize: 9, color: '#555', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
              background: bg(0.03), border: border(0.04),
              borderRadius: 4, padding: '1px 6px',
            }}>
              #{selectedItem.drawable}
            </span>
          </div>
        ) : (
          <div className="flex items-center shrink-0" style={{ padding: '9px 14px' }}>
            <span style={{ fontSize: 10, color: '#2a2a2a' }}>Select an item to preview</span>
          </div>
        )}
      </div>
    </>
  )
}

export default ClothingMenu
