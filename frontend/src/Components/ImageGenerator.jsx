import { useState } from "react";
import { generateRoomThumbnail } from "../utils/imageGenerator";
import "../CSS/imageGenerator.css";

/**
 * ImageGenerator Component
 * Displays images with loading and error states
 * Supports multiple reliable image providers with intelligent fallbacks
 * @param {string} prompt - The prompt/name for image generation
 * @param {string} style - Optional style theme (debate, professional, casual)
 * @param {string} provider - Optional provider: 'unsplash' (default), 'picsum', 'placeholder'
 * @param {string} className - Optional custom CSS class
 * @param {object} containerStyle - Optional inline styles for container
 */
export default function ImageGenerator({
  prompt,
  style = "debate",
  provider = "unsplash",
  className = "",
  containerStyle = {},
  alt = "Generated image",
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentProvider, setCurrentProvider] = useState(provider);
  const [retryCount, setRetryCount] = useState(0);

  // Generate image URL using the current provider
  const imageUrl = generateRoomThumbnail(prompt, style, currentProvider);

  const handleImageError = () => {
    console.error(`Failed to load image from ${currentProvider} provider for: ${prompt}`);
    setImageError(true);
    setImageLoading(false);

    // Intelligent fallback strategy: try alternative providers
    const fallbackProviders = ["unsplash", "picsum", "placeholder"];
    const availableFallbacks = fallbackProviders.filter(p => p !== currentProvider);
    
    if (retryCount < availableFallbacks.length && availableFallbacks.length > 0) {
      const nextProvider = availableFallbacks[retryCount];
      console.log(`Retrying with ${nextProvider} provider...`);
      setCurrentProvider(nextProvider);
      setRetryCount(retryCount + 1);
      setImageError(false);
      setImageLoading(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    if (currentProvider !== provider) {
      console.log(`✅ Successfully loaded image from ${currentProvider}`);
    }
  };

  return (
    <div className={`image-generator-container ${className}`} style={containerStyle}>
      {imageLoading && <div className="image-generator-skeleton" />}

      {!imageError ? (
        <img
          src={imageUrl}
          alt={alt}
          className="image-generator-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous"
        />
      ) : (
        <div className="image-generator-fallback">
          <div className="fallback-icon">🎨</div>
          <span>{prompt || "Image"}</span>
          <small>Loading image...</small>
        </div>
      )}
    </div>
  );
}
