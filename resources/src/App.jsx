import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Shirt, RotateCcw, X, Play } from 'lucide-react'
import { CapturePreview, CAT_ICON_MAP } from './components/CapturePreview'
import { CaptureWidget }  from './components/CaptureWidget'
import { ClothingMenu }   from './components/ClothingMenu'

// ── NUI bridge ──────────────────────────────────────
const fetchNUI = async (eventName, data = {}) => {
  try {
    const r = await fetch(`https://uz_AutoShot/${eventName}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    return await r.json()
  } catch { return null }
}

// ── Orbit hint ──────────────────────────────────────
function OrbitHint() {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-enter">
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass"
        style={{ border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: '#666' }}>Orbit</span>
        </span>
        <span style={{ color: '#333', fontSize: 10 }}>|</span>
        <span style={{ fontSize: 10, color: '#666' }}>
          <strong style={{ color: '#ddd', fontWeight: 600 }}>LMB</strong> Rotate
        </span>
        <span style={{ fontSize: 10, color: '#666' }}>
          <strong style={{ color: '#ddd', fontWeight: 600 }}>Scroll</strong> Zoom
        </span>
      </div>
    </div>
  )
}

// ── Recapture preview panel ─────────────────────────
function RecapturePanel({ count, onConfirm, onCancel }) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-enter" data-no-orbit>
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass"
        style={{ border: '1px solid rgba(251,146,60,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
        <RotateCcw style={{ width: 12, height: 12, color: '#fb923c', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#999' }}>
          <span style={{ color: '#fb923c', fontWeight: 700 }}>{count}</span> item · Adjust camera
        </span>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        <button onClick={onConfirm}
          className="flex items-center gap-1.5"
          style={{
            background: '#fb923c', color: '#000', border: 'none', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
          <Play style={{ width: 8, height: 8 }} />
          Start
        </button>
        <button onClick={onCancel}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: '#555' }}>
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  )
}

// ── App ─────────────────────────────────────────────
export default function App() {
  const [visible,             setVisible]             = useState(false)
  const [gender,              setGender]              = useState('male')
  const [imgExt,              setImgExt]              = useState('png')
  const [categories,          setCategories]          = useState([])
  const [activeCatIdx,        setActiveCatIdx]        = useState(0)
  const [items,               setItems]               = useState([])
  const [selectedItem,        setSelectedItem]        = useState(null)
  const [searchQuery,         setSearchQuery]         = useState('')

  const [previewing,          setPreviewing]          = useState(false)
  const [previewCats,         setPreviewCats]         = useState([])
  const [capturing,           setCapturing]           = useState(false)
  const [capturePaused,       setCapturePaused]       = useState(false)
  const [overlayVisible,      setOverlayVisible]      = useState(true)
  const [progress,            setProgress]            = useState({ current: 0, total: 0, category: '' })

  const [recapturePreviewing, setRecapturePreviewing] = useState(false)
  const [recaptureQueue,      setRecaptureQueue]      = useState([])

  // ── NUI messages ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const d = e.data
      switch (d.type) {
        case 'openMenu':
          setGender(d.gender)
          setCategories(d.categories || [])
          setActiveCatIdx(0)
          setSelectedItem(null)
          setSearchQuery('')
          if (d.imgExt) setImgExt(d.imgExt)
          setVisible(true)
          break
        case 'capturePreview':
          setPreviewCats(d.categories || [])
          setPreviewing(true)
          break
        case 'captureStart':
          setPreviewing(false); setRecapturePreviewing(false)
          setCapturing(true); setCapturePaused(false)
          setOverlayVisible(true); setProgress({ current: 0, total: 0, category: '' })
          break
        case 'setCapturePaused':  setCapturePaused(d.paused); break
        case 'captureProgress':   setProgress({ current: d.current || 0, total: d.total || 0, category: d.category || '' }); break
        case 'captureComplete':
        case 'captureCancelled':  setPreviewing(false); setCapturing(false); setCapturePaused(false); setRecapturePreviewing(false); break
        case 'setOverlayVisible': setOverlayVisible(d.visible); break
        case 'forceClose':        setVisible(false); setPreviewing(false); setRecapturePreviewing(false); break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Load items for active category ────────────────
  useEffect(() => {
    if (!categories.length) return
    const cat = categories[activeCatIdx]
    if (!cat) return
    const arr = []
    for (let d = 0; d < cat.drawables; d++)
      arr.push({ type: cat.type, id: cat.id, gender, drawable: d, texture: 0, label: cat.label })
    setItems(arr)
    setSelectedItem(null)
    if (visible && cat.camera) fetchNUI('setCameraPreset', { camera: cat.camera })
  }, [activeCatIdx, categories, gender, visible])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.trim().toLowerCase()
    return items.filter(i => `#${i.drawable}`.includes(q) || i.label.toLowerCase().includes(q))
  }, [items, searchQuery])

  // ── Handlers ──────────────────────────────────────
  const handleSelect = useCallback(async (item) => {
    setSelectedItem(item)
    await fetchNUI('applyClothing', { itemType: item.type, id: item.id, drawable: item.drawable, texture: item.texture })
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    fetchNUI('closeMenu')
  }, [])

  const handlePause  = useCallback(() => { setCapturePaused(true);  fetchNUI('pauseCapture')  }, [])
  const handleResume = useCallback(() => { setCapturePaused(false); fetchNUI('resumeCapture') }, [])
  const handleCancel = useCallback(() => { setCapturing(false); setCapturePaused(false); fetchNUI('cancelCapture') }, [])

  const handleRecapture = useCallback((items) => {
    setRecaptureQueue(items)
    setVisible(false)
    setRecapturePreviewing(true)
    fetchNUI('enterRecapturePreview')
  }, [])

  const handleRecaptureConfirm = useCallback(() => {
    setRecapturePreviewing(false)
    fetchNUI('recaptureItems', { items: recaptureQueue })
  }, [recaptureQueue])

  const handleRecaptureCancel = useCallback(() => {
    setRecapturePreviewing(false)
    setRecaptureQueue([])
    fetchNUI('cancelRecapturePreview')
  }, [])

  const handleCancelPreview = useCallback(() => {
    setPreviewing(false)
    fetchNUI('cancelPreview')
  }, [])

  const handlePreviewStart = useCallback((chosen) => {
    const sc = chosen.filter(c => c.type === 'component').map(c => c.id)
    const sp = chosen.filter(c => c.type === 'prop').map(c => c.id)
    setPreviewing(false)
    fetchNUI('startCapture', { selectedComponents: sc, selectedProps: sp })
  }, [])

  const handlePreviewActiveChange = useCallback((cat) => {
    if (cat.camera) fetchNUI('setCameraPreset', { camera: cat.camera })
  }, [])

  const handleSaveAngle = useCallback((camera) => {
    fetchNUI('saveCameraAngle', { camera })
  }, [])

  // ── Camera orbit ──────────────────────────────────
  const isDraggingRef = useRef(false)
  const lastMouseRef  = useRef({ x: 0, y: 0 })

  const handleOrbitDown = useCallback((e) => {
    if (e.target.closest('[data-no-orbit]')) return
    isDraggingRef.current = true
    lastMouseRef.current  = { x: e.clientX, y: e.clientY }
  }, [])

  const handleOrbitMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    fetchNUI('rotateCamera', { deltaX: e.clientX - lastMouseRef.current.x, deltaY: e.clientY - lastMouseRef.current.y })
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleOrbitUp = useCallback(() => { isDraggingRef.current = false }, [])

  const handleOrbitWheel = useCallback((e) => {
    if (e.target.closest('[data-no-orbit]')) return
    fetchNUI('zoomCamera', { delta: e.deltaY > 0 ? 1 : -1 })
  }, [])

  // ── Render ────────────────────────────────────────
  if (!visible && !capturing && !previewing && !recapturePreviewing) return null

  // Recapture camera preview
  if (recapturePreviewing) {
    return (
      <div className="fixed inset-0 z-[9998] cursor-grab active:cursor-grabbing"
        onMouseDown={handleOrbitDown} onMouseMove={handleOrbitMove}
        onMouseUp={handleOrbitUp} onMouseLeave={handleOrbitUp} onWheel={handleOrbitWheel}>
        <RecapturePanel count={recaptureQueue.length} onConfirm={handleRecaptureConfirm} onCancel={handleRecaptureCancel} />
        <OrbitHint />
      </div>
    )
  }

  // Capture preview
  if (previewing) {
    const previewCategories = previewCats.map((cat, idx) => ({
      key: `${cat.type}-${cat.id}-${idx}`, label: cat.label,
      icon: CAT_ICON_MAP[cat.label] ?? Shirt,
      type: cat.type, id: cat.id, camera: cat.camera,
    }))
    return (
      <div className="fixed inset-0 z-[9998] cursor-grab active:cursor-grabbing"
        onMouseDown={handleOrbitDown} onMouseMove={handleOrbitMove}
        onMouseUp={handleOrbitUp} onMouseLeave={handleOrbitUp} onWheel={handleOrbitWheel}>
        <div data-no-orbit className="absolute right-5 top-1/2 -translate-y-1/2 z-[9999]">
          <CapturePreview
            categories={previewCategories}
            onStart={handlePreviewStart}
            onCancel={handleCancelPreview}
            onActiveChange={handlePreviewActiveChange}
            onSaveAngle={handleSaveAngle}
          />
        </div>
        <OrbitHint />
      </div>
    )
  }

  // Capture in progress
  if (capturing) {
    if (!overlayVisible) return null
    return (
      <CaptureWidget
        progress={progress}
        onPause={handlePause} onResume={handleResume} onCancel={handleCancel}
        isPaused={capturePaused}
      />
    )
  }

  // Main catalog
  return (
    <div className="fixed inset-0 z-[9998] cursor-grab active:cursor-grabbing bg-transparent"
      onMouseDown={handleOrbitDown} onMouseMove={handleOrbitMove}
      onMouseUp={handleOrbitUp} onMouseLeave={handleOrbitUp} onWheel={handleOrbitWheel}>
      <ClothingMenu
        categories={categories} activeCatIdx={activeCatIdx} onCategoryChange={setActiveCatIdx}
        filteredItems={filteredItems} selectedItem={selectedItem} onItemSelect={handleSelect}
        imgExt={imgExt} searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onClose={handleClose} onRecapture={handleRecapture}
      />
      <OrbitHint />
    </div>
  )
}
