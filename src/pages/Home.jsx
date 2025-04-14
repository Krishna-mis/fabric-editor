import { useState } from "react";
import { useNavigate } from "react-router-dom";

const PEXELS_API_KEY =
  "Z2rrzfUou58lWKf3GHFUAkdOfpZ81pUW33Gu28SEx5vKCmJSvarb28T2";

const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Please enter a search term");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${searchTerm}&per_page=10`,
        {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
          mode: "cors",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Images fetched:", data.photos.length);
      setImages(data.photos);
    } catch (error) {
      console.error("Pexels API Error:", error);
      setError(
        "Failed to fetch images. Please check your API key or network connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToEditor = (imageUrl) => {
    console.log("Navigating to editor with image:", imageUrl);
    navigate("/editor", { state: { imageUrl } });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">
        Image Search & Caption Editor
      </h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          className="border p-2 rounded flex-grow"
          placeholder="Search for images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <p>Loading images...</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="border rounded overflow-hidden shadow hover:shadow-lg transition-shadow"
          >
            <div className="h-48 relative">
              <img
                src={img.src.medium}
                alt={img.alt}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-500 truncate">
                Photo by: {img.photographer}
              </p>
              <button
                onClick={() => handleNavigateToEditor(img.src.large)}
                className="w-full bg-green-600 text-white py-2 mt-2 rounded hover:bg-green-700 transition-colors"
              >
                Add Captions
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm
            ? "No images found. Try a different search term."
            : "Search for images to get started."}
        </div>
      )}
    </div>
  );
};

export default Home;
