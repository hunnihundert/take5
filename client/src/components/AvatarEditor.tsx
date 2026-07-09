import { useState, useRef, useEffect } from 'react';

interface AvatarEditorProps {
  imageUrl: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
}

const AvatarEditor = ({ imageUrl, onSave, onCancel }: AvatarEditorProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setLoadedImage(img);
      // Center the image initially
      if (containerRef.current) {
        const containerSize = 300;
        const imgAspect = img.width / img.height;
        let initialScale;

        if (imgAspect > 1) {
          // Landscape
          initialScale = containerSize / img.height;
        } else {
          // Portrait or square
          initialScale = containerSize / img.width;
        }

        setScale(initialScale);
        setPosition({ x: 0, y: 0 });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (loadedImage) {
      drawImage();
    }
  }, [scale, position, loadedImage]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = loadedImage;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw image with scale and position
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw circular overlay
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new canvas for the final avatar
    const finalCanvas = document.createElement('canvas');
    const finalSize = 200;
    finalCanvas.width = finalSize;
    finalCanvas.height = finalSize;
    const finalCtx = finalCanvas.getContext('2d');

    if (!finalCtx) return;

    // Draw the cropped image
    const img = loadedImage;
    if (!img) return;

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (300 - scaledWidth) / 2 + position.x;
    const y = (300 - scaledHeight) / 2 + position.y;

    // JPEG has no alpha channel, so give transparent source pixels a white
    // background instead of the default black. The circular crop is applied
    // by CSS (rounded-full) wherever avatars are rendered, so no mask here.
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalSize, finalSize);

    // Scale down to final size
    const scaleRatio = finalSize / 300;
    finalCtx.drawImage(
      img,
      x * scaleRatio,
      y * scaleRatio,
      scaledWidth * scaleRatio,
      scaledHeight * scaleRatio
    );

    // Export as JPEG to keep the data URL small enough for the server's
    // avatar size limit (base64 PNGs of photos are several times larger)
    const croppedImage = finalCanvas.toDataURL('image/jpeg', 0.85);
    onSave(croppedImage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Avatar bearbeiten</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Verwende die Maus zum Verschieben und das Mausrad zum Zoomen
          </p>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="relative mx-auto mb-6 cursor-move select-none"
          style={{ width: '300px', height: '300px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            className="rounded-full border-4 border-gray-300"
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        {/* Zoom Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zoom: {Math.round(scale * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition duration-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;
