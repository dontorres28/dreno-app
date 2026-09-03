import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob, previewUrl: string) => void;
  outputSize?: number;
}

const FRAME = 320;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function ImageCropper({ file, onCancel, onSave, outputSize = 512 }: Props) {
  const [src, setSrc] = useState('');
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseFit = imgSize ? Math.max(FRAME / imgSize.w, FRAME / imgSize.h) : 1;

  const clampOffset = useCallback((nx: number, ny: number, z: number) => {
    if (!imgSize) return { x: 0, y: 0 };
    const scaled = { w: imgSize.w * baseFit * z, h: imgSize.h * baseFit * z };
    const maxX = (scaled.w - FRAME) / 2;
    const maxY = (scaled.h - FRAME) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, [imgSize, baseFit]);

  useEffect(() => {
    setOffset(o => clampOffset(o.x, o.y, zoom));
  }, [zoom, clampOffset]);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.originX + dx, dragRef.current.originY + dy, zoom));
  }
  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom - e.deltaY * 0.002));
    setZoom(next);
  }

  async function save() {
    if (!imgSize) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');

      const displayedScale = baseFit * zoom;
      const cropSourceSize = FRAME / displayedScale;
      const sourceX = imgSize.w / 2 - offset.x / displayedScale - cropSourceSize / 2;
      const sourceY = imgSize.h / 2 - offset.y / displayedScale - cropSourceSize / 2;

      const img = new Image();
      img.src = src;
      await new Promise(res => { img.onload = res; });

      ctx.drawImage(img, sourceX, sourceY, cropSourceSize, cropSourceSize, 0, 0, outputSize, outputSize);

      canvas.toBlob(blob => {
        if (!blob) { setSaving(false); return; }
        const preview = URL.createObjectURL(blob);
        onSave(blob, preview);
      }, 'image/jpeg', 0.92);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        animation: 'cropperFadeIn 200ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <style>{`
        @keyframes cropperFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cropperRise { from { transform: translateY(10px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>

      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 24, padding: '1.5rem',
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: '1rem',
        animation: 'cropperRise 260ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}>
        <div>
          <p className="label" style={{ margin: 0, marginBottom: 6 }}>Adjust photo</p>
          <p style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
            Drag to reposition. Pinch or scroll to zoom.
          </p>
        </div>

        {/* Crop frame */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            style={{
              position: 'relative',
              width: FRAME, height: FRAME,
              borderRadius: 16,
              overflow: 'hidden',
              background: 'var(--surface-2)',
              cursor: dragRef.current ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {imgSize && src && (
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: imgSize.w * baseFit,
                  height: imgSize.h * baseFit,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: 'center',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Rule-of-thirds Raster overlay */}
            <svg
              width={FRAME} height={FRAME} viewBox={`0 0 ${FRAME} ${FRAME}`}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              aria-hidden
            >
              <line x1={FRAME / 3} y1={0} x2={FRAME / 3} y2={FRAME} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <line x1={(FRAME / 3) * 2} y1={0} x2={(FRAME / 3) * 2} y2={FRAME} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <line x1={0} y1={FRAME / 3} x2={FRAME} y2={FRAME / 3} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <line x1={0} y1={(FRAME / 3) * 2} x2={FRAME} y2={(FRAME / 3) * 2} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              {/* Corner brackets */}
              {[[0, 0], [FRAME, 0], [0, FRAME], [FRAME, FRAME]].map(([x, y], i) => {
                const dx = x === 0 ? 1 : -1;
                const dy = y === 0 ? 1 : -1;
                return (
                  <g key={i} stroke="#fff" strokeWidth="1.5" fill="none">
                    <line x1={x} y1={y} x2={x + dx * 16} y2={y} />
                    <line x1={x} y1={y} x2={x} y2={y + dy * 16} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--w60)', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4.5 6.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{
              flex: 1, accentColor: 'var(--red)', height: 4, cursor: 'pointer',
            }}
          />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--w60)', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4.5 6.5h4M6.5 4.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1, height: 44, borderRadius: 50, fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
              background: 'transparent',
              border: '0.5px solid var(--surface-border-2)',
              color: 'var(--w70)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms',
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !imgSize}
            style={{
              flex: 1, height: 44, borderRadius: 50, fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
              background: 'var(--red)', border: '0.5px solid var(--red)', color: '#fff',
              cursor: saving || !imgSize ? 'not-allowed' : 'pointer',
              opacity: saving || !imgSize ? 0.6 : 1,
              transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {saving ? 'Saving…' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
