
import React, { useState, useCallback, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import Spinner from './Spinner';
import { PhotoIcon, SparklesIcon, ArrowDownTrayIcon, TypeIcon } from './IconComponents';
import { ASPECT_RATIOS, AspectRatio } from '../types';

const FONT_FAMILIES = ['Impact', 'Arial', 'Verdana', 'Georgia', 'Courier New'];
type TextPosition = 'top' | 'middle' | 'bottom';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Text Overlay State
  const [imageWithText, setImageWithText] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState<string>('');
  const [fontFamily, setFontFamily] = useState<string>('Impact');
  const [fontSize, setFontSize] = useState<number>(64);
  const [fontColor, setFontColor] = useState<string>('#FFFFFF');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [textPosition, setTextPosition] = useState<TextPosition>('middle');

  useEffect(() => {
    if (!generatedImage) {
      setImageWithText(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = generatedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // If there's text, draw it
      if (overlayText.trim()) {
          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.fillStyle = fontColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = fontSize / 20;
          ctx.textAlign = 'center';
          
          let y;
          const x = canvas.width / 2;
          const margin = fontSize;

          switch(textPosition) {
              case 'top':
                  ctx.textBaseline = 'top';
                  y = margin;
                  break;
              case 'bottom':
                  ctx.textBaseline = 'bottom';
                  y = canvas.height - margin;
                  break;
              case 'middle':
              default:
                  ctx.textBaseline = 'middle';
                  y = canvas.height / 2;
                  break;
          }

          ctx.strokeText(overlayText, x, y);
          ctx.fillText(overlayText, x, y);
      }
      
      setImageWithText(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      // Fallback if image fails to load on canvas, though unlikely with data URLs
      setImageWithText(generatedImage);
    }

  }, [generatedImage, overlayText, fontFamily, fontSize, fontColor, strokeColor, textPosition]);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setOverlayText('');
    try {
      const base64Image = await generateImage(prompt, aspectRatio);
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError('Failed to generate image. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio]);
  
  const handleDownload = () => {
    if (!imageWithText) return;
    const link = document.createElement('a');
    link.href = imageWithText;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TextOverlayEditor = () => (
    <div className="md:w-1/3 bg-gray-900/50 p-4 rounded-lg flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <TypeIcon className="w-6 h-6 text-gray-400"/>
            <h3 className="text-lg font-semibold text-white">Text Overlay</h3>
        </div>
        <div className="space-y-3 flex-grow overflow-y-auto pr-2">
            <div>
                <label htmlFor="overlay-text" className="block text-xs font-medium text-gray-400 mb-1">Text</label>
                <input id="overlay-text" type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)} className="w-full bg-gray-700 rounded px-2 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:ring-0" placeholder="Your text here..."/>
            </div>
            <div>
                <label htmlFor="font-family" className="block text-xs font-medium text-gray-400 mb-1">Font</label>
                <select id="font-family" value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-700 rounded px-2 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:ring-0">
                    {/* FIX: Corrected typo from FONT_FAMILES to FONT_FAMILIES */}
                    {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="font-size" className="block text-xs font-medium text-gray-400 mb-1">Size: {fontSize}px</label>
                <input id="font-size" type="range" min="12" max="128" step="2" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label htmlFor="font-color" className="block text-xs font-medium text-gray-400 mb-1">Color</label>
                    <input id="font-color" type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} className="w-full h-8 p-0 border-0 bg-transparent cursor-pointer"/>
                </div>
                <div>
                    <label htmlFor="stroke-color" className="block text-xs font-medium text-gray-400 mb-1">Outline</label>
                    <input id="stroke-color" type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="w-full h-8 p-0 border-0 bg-transparent cursor-pointer"/>
                </div>
            </div>
             <div>
                <label htmlFor="text-position" className="block text-xs font-medium text-gray-400 mb-1">Position</label>
                <select id="text-position" value={textPosition} onChange={e => setTextPosition(e.target.value as TextPosition)} className="w-full bg-gray-700 rounded px-2 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:ring-0">
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                </select>
            </div>
        </div>
        <button onClick={handleDownload} className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
            <ArrowDownTrayIcon className="w-5 h-5" /> Download Image
        </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <PhotoIcon className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">AI Image Generator</h2>
      </div>
      <p className="text-gray-400 mb-6">Describe the image you want to create, then add your own text overlay. Powered by Imagen 4.</p>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-grow space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
            <textarea
              id="prompt"
              rows={3}
              className="block w-full rounded-md border-0 bg-gray-700 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 p-3"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A majestic lion wearing a crown, cinematic lighting, hyperrealistic"
            />
          </div>
          
          <div>
            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
            <select
              id="aspect-ratio"
              className="block w-full rounded-md border-0 bg-gray-700 py-2 pl-3 pr-10 text-gray-200 ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            >
              {ASPECT_RATIOS.map(ratio => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:bg-blue-800 disabled:cursor-not-allowed">
            {isLoading ? <><Spinner /> Generating...</> : <><SparklesIcon className="w-5 h-5" /> Generate Image</>}
          </button>
          
          {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
          
          <div className="mt-6 flex justify-center items-center bg-gray-900/50 rounded-lg min-h-[300px] p-4">
            {isLoading && <Spinner size="lg" />}
            {!isLoading && imageWithText && (
              <img src={imageWithText} alt="Generated art" className="max-w-full max-h-[70vh] rounded-lg shadow-lg" />
            )}
            {!isLoading && !generatedImage && (
              <p className="text-gray-500">Your generated image will appear here.</p>
            )}
          </div>
        </div>
        
        {generatedImage && <TextOverlayEditor />}

      </div>
    </div>
  );
};

export default ImageGenerator;
