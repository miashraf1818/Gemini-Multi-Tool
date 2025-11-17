import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import Spinner from './Spinner';
import { 
    PaintBrushIcon, DocumentArrowUpIcon, SparklesIcon, PencilSquareIcon, CheckIcon, XMarkIcon,
    ContrastIcon, SaturationIcon, ArrowDownTrayIcon
} from './IconComponents';

const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);
  const [tempContrast, setTempContrast] = useState<number>(1);
  const [tempSaturation, setTempSaturation] = useState<number>(1);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      setEditedImage(null);
      setError(null);
      setPrompt('');
      
      // Reset client-side edits
      setIsEditing(false);
      setContrast(1);
      setSaturation(1);
      setTempContrast(1);
      setTempSaturation(1);

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        setOriginalImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = useCallback(async () => {
    if (!image || !prompt) {
      setError('Please provide an editing instruction.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const base64Data = image!.split(',')[1];
      const mimeType = image!.split(',')[0].split(';')[0].split(':')[1];
      const result = await editImage(base64Data, mimeType, prompt);
      setEditedImage(`data:image/png;base64,${result}`);
    } catch (err) {
      setError('Failed to edit image. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [image, prompt]);

  const handleEditToggle = () => {
    if (!isEditing) {
        setTempContrast(contrast);
        setTempSaturation(saturation);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    if (!originalImage) return;

    const img = new Image();
    img.src = originalImage;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.filter = `contrast(${tempContrast}) saturate(${tempSaturation})`;
        
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL(imageFile?.type || 'image/jpeg');
        setImage(dataUrl);
        setContrast(tempContrast);
        setSaturation(tempSaturation);
        setIsEditing(false);
    };
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const EditorPanel = () => (
    <div className="p-4 bg-gray-700 rounded-lg h-full flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Adjust Image</h3>
        <div className="space-y-6 flex-grow">
            <div>
                <label htmlFor="contrast" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <ContrastIcon className="w-5 h-5"/> Contrast: {Math.round(tempContrast * 100)}%
                </label>
                <input
                    id="contrast" type="range" min="0.5" max="2" step="0.05"
                    value={tempContrast} onChange={e => setTempContrast(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div>
                <label htmlFor="saturation" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <SaturationIcon className="w-5 h-5"/> Saturation: {Math.round(tempSaturation * 100)}%
                </label>
                <input
                    id="saturation" type="range" min="0" max="2" step="0.05"
                    value={tempSaturation} onChange={e => setTempSaturation(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
        <div className="flex gap-2 mt-4">
            <button onClick={handleEditToggle} className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                <XMarkIcon className="w-5 h-5"/> Cancel
            </button>
            <button onClick={handleSaveChanges} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                <CheckIcon className="w-5 h-5"/> Apply
            </button>
        </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <PaintBrushIcon className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">AI Image Editor</h2>
      </div>
      <p className="text-gray-400 mb-6">Adjust your photo with client-side tools, then tell Gemini how to change it. Powered by Nano Banana.</p>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Upload & Prompt */}
        <div className="md:w-1/3 space-y-4 flex flex-col">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50 min-h-[200px]">
            {!image ? (
              <div className="text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-500" />
                <label htmlFor="image-editor-upload" className="relative cursor-pointer mt-4 rounded-md font-semibold text-blue-500 hover:text-blue-400">
                  <span>Upload an image</span>
                  <input id="image-editor-upload" name="image-editor-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                </label>
                <p className="text-xs leading-5 text-gray-400 mt-1">PNG, JPG, etc.</p>
              </div>
            ) : (
               <img 
                src={image} 
                alt="Original" 
                className="w-full h-auto max-h-60 object-contain rounded-lg" 
                style={{
                    filter: isEditing ? `contrast(${tempContrast}) saturate(${tempSaturation})` : `contrast(${contrast}) saturate(${saturation})`,
                    transition: 'filter 0.2s ease-in-out',
                }}
              />
            )}
          </div>
          
          {image && (
            isEditing ? <EditorPanel /> :
            <div className="flex flex-col space-y-4 flex-grow">
                 <button onClick={handleEditToggle} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200">
                    <PencilSquareIcon className="w-5 h-5" /> Adjust Image
                </button>
                <div>
                    <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-300 mb-1">AI Edit Instruction</label>
                    <textarea
                    id="edit-prompt"
                    rows={3}
                    className="block w-full rounded-md border-0 bg-gray-700 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 p-3"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Add a retro filter, change the text on the sign to 'Welcome', or add 'Happy Summer!' in a fun font"
                    disabled={!image}
                    />
                </div>
                <button onClick={handleEdit} disabled={isLoading || !prompt || !image} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:bg-blue-800 disabled:cursor-not-allowed">
                    {isLoading ? <><Spinner /> Applying AI...</> : <><SparklesIcon className="w-5 h-5" /> Apply AI Edit</>}
                </button>
                {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Right Side: Edited Image */}
        <div className="md:w-2/3 flex flex-col justify-center items-center bg-gray-900/50 rounded-lg min-h-[400px] p-4 space-y-4">
          {isLoading && <Spinner size="lg" />}
          {!isLoading && editedImage && (
            <>
              <img src={editedImage} alt="Edited" className="max-w-full max-h-[70vh] rounded-lg shadow-lg" />
              <button onClick={handleDownload} className="w-1/2 mt-2 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                  <ArrowDownTrayIcon className="w-5 h-5" /> Download
              </button>
            </>
          )}
          {!isLoading && !editedImage && (
            <p className="text-gray-500 text-center">Your AI-edited image will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;