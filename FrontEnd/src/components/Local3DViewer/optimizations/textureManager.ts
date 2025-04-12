import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Configuration options for the texture manager
 */
export interface TextureManagerOptions {
  maxTextureSize?: number;    // Maximum texture size to use (helps with memory)
  anisotropy?: number;        // Anisotropic filtering level (1-16, higher = better quality but slower)
  useMipmaps?: boolean;       // Whether to generate mipmaps for textures (better quality when scaled)
  cacheTextures?: boolean;    // Whether to cache textures (reuse instead of loading multiple times)
  priorityUrls?: string[];    // URLs of textures to load immediately
  lowPriorityUrls?: string[]; // URLs of textures to load in the background
}

// Global texture cache
const globalTextureCache = new Map<string, THREE.Texture>();

/**
 * Optimizes a texture based on configuration options
 * 
 * @param texture The texture to optimize
 * @param options Options for optimization
 * @returns The optimized texture
 */
export const optimizeTexture = (
  texture: THREE.Texture,
  options: TextureManagerOptions = {}
): THREE.Texture => {
  const {
    maxTextureSize = 2048,
    anisotropy = 4,
    useMipmaps = true
  } = options;
  
  // Skip optimization if texture is not loaded
  if (!texture.image) return texture;
  
  // Apply anisotropic filtering if available on the GPU
  if (texture.anisotropy !== undefined) {
    const renderer = new THREE.WebGLRenderer();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    renderer.dispose();
    
    texture.anisotropy = Math.min(anisotropy, maxAnisotropy);
  }
  
  // Resize texture if it's too large
  if (texture.image && (texture.image.width > maxTextureSize || texture.image.height > maxTextureSize)) {
    // Resize in a web worker ideally, but for now:
    console.warn(`Texture ${texture.uuid} is larger than max size (${texture.image.width}x${texture.image.height} > ${maxTextureSize})`);
    
    // Maintain aspect ratio
    const aspectRatio = texture.image.width / texture.image.height;
    let newWidth, newHeight;
    
    if (texture.image.width > texture.image.height) {
      newWidth = maxTextureSize;
      newHeight = maxTextureSize / aspectRatio;
    } else {
      newHeight = maxTextureSize;
      newWidth = maxTextureSize * aspectRatio;
    }
    
    // Create a canvas to resize the image
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(texture.image, 0, 0, newWidth, newHeight);
      texture.image = canvas;
      texture.needsUpdate = true;
    }
  }
  
  // Configure mipmaps
  texture.generateMipmaps = useMipmaps;
  
  // Apply common optimizations
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = useMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return texture;
};

/**
 * Loads a texture with optimized settings
 * 
 * @param url URL of the texture to load
 * @param options Options for loading and optimization
 * @returns Promise that resolves to the loaded texture
 */
export const loadOptimizedTexture = (
  url: string,
  options: TextureManagerOptions = {}
): Promise<THREE.Texture> => {
  const { cacheTextures = true } = options;
  
  // Check cache first if enabled
  if (cacheTextures && globalTextureCache.has(url)) {
    return Promise.resolve(globalTextureCache.get(url)!);
  }
  
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    
    loader.load(
      url,
      (texture) => {
        const optimized = optimizeTexture(texture, options);
        
        // Cache the texture if enabled
        if (cacheTextures) {
          globalTextureCache.set(url, optimized);
        }
        
        resolve(optimized);
      },
      undefined, // onProgress is not used
      (error) => {
        console.error(`Failed to load texture: ${url}`, error);
        reject(error);
      }
    );
  });
};

/**
 * Hook for managing and optimizing textures in a React component
 * 
 * @param urls URLs of textures to load
 * @param options Options for loading and optimization
 * @returns Object containing loaded textures and loading status
 */
export const useTextureManager = (
  urls: string[],
  options: TextureManagerOptions = {}
) => {
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    const { priorityUrls = [], lowPriorityUrls = [] } = options;
    
    // Determine loading order: priorityUrls first, then regular urls, then lowPriorityUrls
    const allUrls = [...new Set([
      ...priorityUrls,
      ...urls.filter(url => !priorityUrls.includes(url) && !lowPriorityUrls.includes(url)),
      ...lowPriorityUrls
    ])];
    
    if (allUrls.length === 0) {
      setLoading(false);
      setProgress(1);
      return;
    }
    
    const textureMap = new Map<string, THREE.Texture>();
    let loadedCount = 0;
    
    // Load priority textures immediately
    priorityUrls.forEach(url => {
      loadOptimizedTexture(url, options)
        .then(texture => {
          if (!isMounted) return;
          
          textureMap.set(url, texture);
          loadedCount++;
          setProgress(loadedCount / allUrls.length);
          setTextures(new Map(textureMap));
          
          if (loadedCount === allUrls.length) {
            setLoading(false);
          }
        })
        .catch(err => {
          if (!isMounted) return;
          setError(err);
        });
    });
    
    // Load regular textures
    urls
      .filter(url => !priorityUrls.includes(url) && !lowPriorityUrls.includes(url))
      .forEach(url => {
        loadOptimizedTexture(url, options)
          .then(texture => {
            if (!isMounted) return;
            
            textureMap.set(url, texture);
            loadedCount++;
            setProgress(loadedCount / allUrls.length);
            setTextures(new Map(textureMap));
            
            if (loadedCount === allUrls.length) {
              setLoading(false);
            }
          })
          .catch(err => {
            if (!isMounted) return;
            setError(err);
          });
      });
    
    // Load low priority textures with a delay
    if (lowPriorityUrls.length > 0) {
      setTimeout(() => {
        lowPriorityUrls.forEach(url => {
          loadOptimizedTexture(url, options)
            .then(texture => {
              if (!isMounted) return;
              
              textureMap.set(url, texture);
              loadedCount++;
              setProgress(loadedCount / allUrls.length);
              setTextures(new Map(textureMap));
              
              if (loadedCount === allUrls.length) {
                setLoading(false);
              }
            })
            .catch(err => {
              if (!isMounted) return;
              setError(err);
            });
        });
      }, 500); // 500ms delay for low priority textures
    }
    
    return () => {
      isMounted = false;
    };
  }, [urls, options]);
  
  return { textures, loading, progress, error };
};

/**
 * Clears the texture cache
 * Call this when navigating away from a 3D view or when memory needs to be freed
 */
export const clearTextureCache = () => {
  // Dispose each texture properly to free GPU memory
  globalTextureCache.forEach(texture => {
    texture.dispose();
  });
  
  globalTextureCache.clear();
}; 