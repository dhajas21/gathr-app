'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

interface Area { x: number; y: number; width: number; height: number }

async function cropImageToBlob(imageSrc: string, pixelCrop: Area, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), mimeType, 0.92)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

interface Props {
  src: string
  mimeType: string
  aspect: number
  circular?: boolean
  onConfirm: (blob: Blob, previewUrl: string) => void
  onCancel: () => void
}

export default function ImageCropModal({ src, mimeType, aspect, circular, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [confirming, setConfirming] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setConfirming(true)
    try {
      const blob = await cropImageToBlob(src, croppedAreaPixels, mimeType)
      const url = URL.createObjectURL(blob)
      onConfirm(blob, url)
    } catch {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 safe-area-inset">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-white/10">
        <button onClick={onCancel} className="text-sm text-white/60 active:opacity-60 transition-opacity">Cancel</button>
        <span className="text-sm font-semibold text-[#F0EDE6]">Adjust & crop</span>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="text-sm font-bold text-[#E8B84B] active:opacity-60 transition-opacity disabled:opacity-40"
        >
          {confirming ? 'Saving…' : 'Use photo'}
        </button>
      </div>

      <div className="flex-1 relative">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={circular ? 'round' : 'rect'}
          showGrid={!circular}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid rgba(232,184,75,0.8)' },
          }}
        />
      </div>

      <div className="px-8 pb-8 pt-4 bg-black/80 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center mb-3">Pinch or drag slider to zoom</p>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-full accent-[#E8B84B]"
          aria-label="Zoom"
        />
      </div>
    </div>
  )
}
