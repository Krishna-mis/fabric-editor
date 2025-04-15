import React, { useEffect, useRef, useState, useCallback } from "react";
import { fabric } from "fabric";
import { useLocation } from "react-router-dom";

export default function Editor() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const location = useLocation();
  const imageUrl = location.state?.imageUrl;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  // Resize handler
  const handleResize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;

    // Calculate new canvas dimensions
    const newWidth = Math.min(containerWidth - 32, 1200); // Max width 1200px, padding 16px on each side
    const newHeight = (newWidth * 5) / 8; // Maintain 8:5 aspect ratio

    // Update canvas size
    setCanvasSize({ width: newWidth, height: newHeight });

    // Resize the Fabric.js canvas
    fabricCanvasRef.current.setDimensions({
      width: newWidth,
      height: newHeight,
    });

    // Adjust objects if needed (maintain positions relative to canvas)
    const objects = fabricCanvasRef.current.getObjects();
    const scaleX = newWidth / fabricCanvasRef.current.getWidth();
    const scaleY = newHeight / fabricCanvasRef.current.getHeight();

    objects.forEach((obj) => {
      obj.set({
        left: obj.left * scaleX,
        top: obj.top * scaleY,
        scaleX: obj.scaleX * scaleX,
        scaleY: obj.scaleY * scaleY,
      });
      obj.setCoords();
    });

    fabricCanvasRef.current.renderAll();
  }, []);

  useEffect(() => {
    // Set up resize listener
    window.addEventListener("resize", handleResize);

    // Initial setup
    let canvas = null;
    let resizeTimer;

    const initCanvas = () => {
      try {
        if (
          !fabricCanvasRef.current &&
          canvasRef.current &&
          containerRef.current
        ) {
          // Get container width for responsive canvas
          const containerWidth = containerRef.current.clientWidth;
          const canvasWidth = Math.min(containerWidth - 32, 1200);
          const canvasHeight = (canvasWidth * 5) / 8;

          setCanvasSize({ width: canvasWidth, height: canvasHeight });

          console.log("Creating canvas instance");
          canvas = new fabric.Canvas(canvasRef.current, {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: "#f8f8f8",
          });
          fabricCanvasRef.current = canvas;

          canvas.on("object:modified", updateLayers);
          canvas.on("object:added", updateLayers);
          canvas.on("object:removed", updateLayers);
        }

        if (imageUrl && fabricCanvasRef.current) {
          console.log("Loading image:", imageUrl);
          setIsLoading(true);

          fabric.Image.fromURL(
            imageUrl,
            function (img) {
              if (!fabricCanvasRef.current) return;

              console.log("Image loaded:", img.width, "x", img.height);
              setOriginalImage(img);

              const canvasWidth = fabricCanvasRef.current.getWidth();
              const canvasHeight = fabricCanvasRef.current.getHeight();

              let scale = 1;
              if (img.width > 0 && img.height > 0) {
                scale =
                  Math.min(canvasWidth / img.width, canvasHeight / img.height) *
                  0.9;
              }

              img.set({
                scaleX: scale,
                scaleY: scale,
                originX: "center",
                originY: "center",
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                selectable: true,
                hasControls: true,
              });

              fabricCanvasRef.current.add(img);
              fabricCanvasRef.current.renderAll();

              setIsLoading(false);
              setError(null);
            },
            { crossOrigin: "anonymous" },
            function (err) {
              console.error("Error loading image:", err);
              setError("Failed to load image. Please try again.");
              setIsLoading(false);
            }
          );
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Canvas initialization error:", err);
        setError("Failed to initialize editor. Please refresh the page.");
        setIsLoading(false);
      }
    };

    // Debounced resize to prevent performance issues during resize
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 250);
    };

    window.addEventListener("resize", debouncedResize);
    const timerId = setTimeout(initCanvas, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(timerId);
      clearTimeout(resizeTimer);

      if (canvas) {
        canvas.off("object:modified", updateLayers);
        canvas.off("object:added", updateLayers);
        canvas.off("object:removed", updateLayers);

        try {
          canvas.dispose();
        } catch (err) {
          console.error("Error disposing canvas:", err);
        }
        fabricCanvasRef.current = null;
      }
    };
  }, [imageUrl, handleResize]);

  const updateLayers = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const objects = fabricCanvasRef.current.getObjects();
      const layerData = objects.map((obj, index) => ({
        id: index,
        type: obj.type,
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        text: obj.text || "",
      }));
      setLayers(layerData);
    } catch (err) {
      console.error("Error updating layers:", err);
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const text = new fabric.IText("Double-click to edit", {
        left: fabricCanvasRef.current.getWidth() / 4,
        top: fabricCanvasRef.current.getHeight() / 4,
        fontSize: 20,
        fill: "#000000",
        fontFamily: "Arial",
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      fabricCanvasRef.current.renderAll();
    } catch (err) {
      console.error("Error adding text:", err);
    }
  };

  const addShape = (type) => {
    if (!fabricCanvasRef.current) return;

    try {
      let shape;
      const canvasWidth = fabricCanvasRef.current.getWidth();
      const canvasHeight = fabricCanvasRef.current.getHeight();
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      // Size shapes relative to canvas size
      const sizeScale = Math.min(canvasWidth, canvasHeight) / 10;

      switch (type) {
        case "rect":
          shape = new fabric.Rect({
            width: sizeScale * 2,
            height: sizeScale * 1.6,
            left: centerX - sizeScale,
            top: centerY - sizeScale,
            fill: "rgba(0, 0, 255, 0.4)",
            stroke: "#0000ff",
            strokeWidth: 1,
          });
          break;

        case "circle":
          shape = new fabric.Circle({
            radius: sizeScale * 0.8,
            left: centerX - sizeScale,
            top: centerY - sizeScale,
            fill: "rgba(255, 0, 0, 0.4)",
            stroke: "#ff0000",
            strokeWidth: 1,
          });
          break;

        case "triangle":
          shape = new fabric.Triangle({
            width: sizeScale * 2,
            height: sizeScale * 2,
            left: centerX - sizeScale,
            top: centerY - sizeScale,
            fill: "rgba(0, 255, 0, 0.4)",
            stroke: "#00ff00",
            strokeWidth: 1,
          });
          break;

        case "polygon":
          const sides = 6;
          const radius = sizeScale; // size of the polygon
          const points = [];

          for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            points.push({
              x: radius * Math.cos(angle),
              y: radius * Math.sin(angle),
            });
          }

          shape = new fabric.Polygon(points, {
            left: centerX,
            top: centerY,
            fill: "rgba(255, 165, 0, 0.4)",
            stroke: "#ffa500",
            strokeWidth: 1,
            originX: "center",
            originY: "center",
          });
          break;

        default:
          return;
      }

      fabricCanvasRef.current.add(shape);
      fabricCanvasRef.current.setActiveObject(shape);
      fabricCanvasRef.current.renderAll();
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
    }
  };

  const downloadImage = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1.0,
      });

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "edited-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading image:", err);
      alert("Failed to download the image. Please try again.");
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;

    try {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = "#f8f8f8";
      fabricCanvasRef.current.renderAll();
      updateLayers();
    } catch (err) {
      console.error("Error clearing canvas:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-center">
        Image Editor
      </h2>

      {!imageUrl && (
        <div className="text-center p-2 sm:p-4 bg-yellow-100 rounded mb-2 sm:mb-4">
          No image selected. Please go back and select an image.
        </div>
      )}

      {error && (
        <div className="text-center p-2 sm:p-4 bg-red-100 text-red-700 rounded mb-2 sm:mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left: Canvas Area */}
        <div className="flex-1" ref={containerRef}>
          <div className="mb-2 md:mb-4 flex flex-wrap gap-1 sm:gap-2">
            <button
              onClick={addText}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
              disabled={isLoading}
            >
              Add Text
            </button>
            <button
              onClick={() => addShape("rect")}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
              disabled={isLoading}
            >
              Rectangle
            </button>
            <button
              onClick={() => addShape("circle")}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-yellow-500 text-white hover:bg-yellow-600"
              }`}
              disabled={isLoading}
            >
              Circle
            </button>
            <button
              onClick={() => addShape("triangle")}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-500 text-white hover:bg-purple-600"
              }`}
              disabled={isLoading}
            >
              Triangle
            </button>
            <button
              onClick={() => addShape("polygon")}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-pink-500 text-white hover:bg-pink-600"
              }`}
              disabled={isLoading}
            >
              Polygon
            </button>
            <button
              onClick={clearCanvas}
              className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-500 text-white hover:bg-gray-600"
              }`}
              disabled={isLoading}
            >
              Clear
            </button>
          </div>

          <div className="relative">
            <div className="border rounded shadow-md bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                id="fabric-canvas"
                width={canvasSize.width}
                height={canvasSize.height}
                style={{ width: "100%", height: "auto" }}
              />
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                <p className="text-base sm:text-lg">Loading image...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Layers Panel */}
        <div className="w-full lg:w-1/3 bg-white p-3 sm:p-4 rounded shadow-md flex flex-col h-64 lg:h-auto">
          <h3 className="font-semibold text-base sm:text-lg mb-2">
            Canvas Layers
          </h3>

          <div className="flex-1 overflow-y-auto">
            {layers.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">
                No elements added yet.
              </p>
            ) : (
              <pre className="text-xs sm:text-sm bg-gray-100 p-2 rounded max-h-full overflow-x-auto">
                {JSON.stringify(layers, null, 2)}
              </pre>
            )}
          </div>

          <button
            onClick={downloadImage}
            className={`mt-2 sm:mt-4 px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded ${
              isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            disabled={isLoading}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
