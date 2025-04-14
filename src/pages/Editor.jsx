import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { useLocation } from "react-router-dom";

export default function Editor() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const location = useLocation();
  const imageUrl = location.state?.imageUrl;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);

  useEffect(() => {
    let canvas = null;

    const initCanvas = () => {
      try {
        if (!fabricCanvasRef.current && canvasRef.current) {
          console.log("Creating canvas instance");
          canvas = new fabric.Canvas(canvasRef.current, {
            width: 800,
            height: 500,
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

          const imgElement = new Image();
          imgElement.crossOrigin = "anonymous";

          imgElement.onload = function () {
            if (!fabricCanvasRef.current) return;

            setOriginalImage(imgElement);

            const img = new fabric.Image(imgElement);

            console.log("Image loaded:", img.width, "x", img.height);

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
            });

            fabricCanvasRef.current.setBackgroundImage(
              img,
              fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current)
            );
            setIsLoading(false);
            setError(null);
          };

          imgElement.onerror = function (err) {
            console.error("Error loading image:", err);
            setError("Failed to load image. Please try again.");
            setIsLoading(false);
          };

          imgElement.src = imageUrl;
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Canvas initialization error:", err);
        setError("Failed to initialize editor. Please refresh the page.");
        setIsLoading(false);
      }
    };

    const timerId = setTimeout(initCanvas, 100);

    return () => {
      clearTimeout(timerId);
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
  }, [imageUrl]);

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
        left: 100,
        top: 100,
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

      switch (type) {
        case "rect":
          shape = new fabric.Rect({
            width: 100,
            height: 80,
            left: 150,
            top: 150,
            fill: "rgba(0, 0, 255, 0.4)",
            stroke: "#0000ff",
            strokeWidth: 1,
          });
          break;

        case "circle":
          shape = new fabric.Circle({
            radius: 40,
            left: 150,
            top: 150,
            fill: "rgba(255, 0, 0, 0.4)",
            stroke: "#ff0000",
            strokeWidth: 1,
          });
          break;

        case "triangle":
          shape = new fabric.Triangle({
            width: 100,
            height: 100,
            left: 150,
            top: 150,
            fill: "rgba(0, 255, 0, 0.4)",
            stroke: "#00ff00",
            strokeWidth: 1,
          });
          break;

        case "polygon":
          shape = new fabric.Polygon(
            [
              { x: 50, y: 0 },
              { x: 100, y: 100 },
              { x: 0, y: 100 },
            ],
            {
              left: 150,
              top: 150,
              fill: "rgba(255, 165, 0, 0.4)",
              stroke: "#ffa500",
              strokeWidth: 1,
            }
          );
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
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");

      tempCanvas.width = fabricCanvasRef.current.getWidth();
      tempCanvas.height = fabricCanvasRef.current.getHeight();

      if (originalImage) {
        const bgImg = fabricCanvasRef.current.backgroundImage;

        let drawWidth, drawHeight, drawX, drawY;

        if (bgImg) {
          const scale = bgImg.scaleX || 1;
          drawWidth = originalImage.width * scale;
          drawHeight = originalImage.height * scale;

          if (bgImg.originX === "center" && bgImg.originY === "center") {
            drawX = tempCanvas.width / 2 - drawWidth / 2;
            drawY = tempCanvas.height / 2 - drawHeight / 2;
          } else {
            drawX = bgImg.left || 0;
            drawY = bgImg.top || 0;
          }

          ctx.drawImage(originalImage, drawX, drawY, drawWidth, drawHeight);
        } else {
          ctx.fillStyle = fabricCanvasRef.current.backgroundColor || "#f8f8f8";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
      } else {
        ctx.fillStyle = fabricCanvasRef.current.backgroundColor || "#f8f8f8";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }

      const exportCanvas = new fabric.Canvas(document.createElement("canvas"), {
        width: fabricCanvasRef.current.getWidth(),
        height: fabricCanvasRef.current.getHeight(),
        backgroundColor: "transparent",
      });

      fabricCanvasRef.current.getObjects().forEach((obj) => {
        exportCanvas.add(fabric.util.object.clone(obj));
      });

      exportCanvas.renderAll();

      ctx.drawImage(exportCanvas.lowerCanvasEl, 0, 0);

      exportCanvas.dispose();

      const dataURL = tempCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "edited-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading image:", err);
      alert("Failed to download the complete image.");

      try {
        const exportCanvas = new fabric.Canvas(
          document.createElement("canvas"),
          {
            width: fabricCanvasRef.current.getWidth(),
            height: fabricCanvasRef.current.getHeight(),
          }
        );

        fabricCanvasRef.current.getObjects().forEach((obj) => {
          exportCanvas.add(fabric.util.object.clone(obj));
        });

        exportCanvas.backgroundColor = fabricCanvasRef.current.backgroundColor;
        exportCanvas.renderAll();

        const dataURL = exportCanvas.toDataURL({
          format: "png",
          quality: 1.0,
        });

        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "edited-image-without-background.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        exportCanvas.dispose();
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        alert("Could not download image due to browser security restrictions.");
      }
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;

    try {
      // Remove all objects but keep background
      fabricCanvasRef.current.getObjects().forEach((obj) => {
        fabricCanvasRef.current.remove(obj);
      });
      fabricCanvasRef.current.renderAll();
      updateLayers();
    } catch (err) {
      console.error("Error clearing canvas:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Image Editor</h2>

      {!imageUrl && (
        <div className="text-center p-4 bg-yellow-100 rounded mb-4">
          No image selected. Please go back and select an image.
        </div>
      )}

      {error && (
        <div className="text-center p-4 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Canvas Area */}
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={addText}
              className={`px-4 py-2 rounded ${
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
              className={`px-4 py-2 rounded ${
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
              className={`px-4 py-2 rounded ${
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
              className={`px-4 py-2 rounded ${
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
              className={`px-4 py-2 rounded ${
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
              className={`px-4 py-2 rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-500 text-white hover:bg-gray-600"
              }`}
              disabled={isLoading}
            >
              Clear
            </button>
            <button
              onClick={downloadImage}
              className={`ml-auto px-4 py-2 rounded ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
              disabled={isLoading}
            >
              Download
            </button>
          </div>

          <div className="relative">
            <div className="border rounded shadow-md bg-white">
              <canvas
                ref={canvasRef}
                id="fabric-canvas"
                width="800"
                height="500"
              />
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                <p className="text-lg">Loading image...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Layers Panel */}
        <div className="w-full lg:w-1/3 bg-white p-4 rounded shadow-md">
          <h3 className="font-semibold text-lg mb-2">Canvas Layers</h3>
          {layers.length === 0 ? (
            <p className="text-gray-500">No elements added yet.</p>
          ) : (
            <pre className="text-sm bg-gray-100 p-2 rounded max-h-[500px] overflow-y-auto">
              {JSON.stringify(layers, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
