import React, { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeBill, extractTextFromImage } from '../services/geminiService';
import Spinner from './Spinner';
import { 
    DocumentArrowUpIcon, DocumentTextIcon, SparklesIcon, ArrowDownTrayIcon, TrashIcon, ClockIcon,
    PencilSquareIcon, SunIcon, ArrowUturnLeftIcon, CheckIcon, XMarkIcon, ClipboardDocumentIcon,
    BoldIcon, ItalicIcon, UnderlineIcon
} from './IconComponents';
// FIX: Imported `BillItem` to resolve a type error in `handleFormatChange`.
import { BillData, ScanHistoryItem, BillItem } from '../types';

type ScanMode = 'bill' | 'ocr';
type ActiveField = { type: 'item' | 'total', index: number, field: string };

const BillScanner: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('bill');
  
  // Editing State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isHistoryView, setIsHistoryView] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(1);
  const [tempRotation, setTempRotation] = useState<number>(0);
  const [tempBrightness, setTempBrightness] = useState<number>(1);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  // UI State for animations
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);


  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('billScannerHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
      localStorage.removeItem('billScannerHistory');
    }
  }, []);

  const resetStateForNewImage = (file: File) => {
    setImageFile(file);
    setIsHistoryView(false);
    setBillData(null);
    setOcrText(null);
    setError(null);
    setIsEditing(false);
    setRotation(0);
    setBrightness(1);
    setTempRotation(0);
    setTempBrightness(1);
    setSelectedHistoryId(null);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      resetStateForNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        setOriginalImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = useCallback(async () => {
    if (!image || !imageFile) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setBillData(null);
    setOcrText(null);
    setSelectedHistoryId(null);

    try {
      const base64Data = image.split(',')[1];
      if (scanMode === 'bill') {
        const result = await analyzeBill(base64Data, imageFile.type);
        setBillData(result);
        
        const newHistoryItem: ScanHistoryItem = {
          id: new Date().toISOString(),
          imageDataUrl: image,
          billData: result,
          timestamp: Date.now(),
        };
        const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('billScannerHistory', JSON.stringify(updatedHistory));
      } else {
        const result = await extractTextFromImage(base64Data, imageFile.type);
        setOcrText(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze the document. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [image, imageFile, history, scanMode]);
  
  const handleDownloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = imageFile?.name || 'document-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleHistoryClick = (item: ScanHistoryItem) => {
    setImage(item.imageDataUrl);
    setOriginalImage(item.imageDataUrl);
    setBillData(item.billData);
    setImageFile(null); 
    setIsHistoryView(true);
    setIsEditing(false);
    setError(null);
    setSelectedHistoryId(item.id);
  };
  
  const handleClearHistory = () => {
    if (history.length === 0) return;
    setIsClearing(true);
    setTimeout(() => {
        setHistory([]);
        localStorage.removeItem('billScannerHistory');
        setIsClearing(false);
    }, 500); // Wait for animation to complete
  };

  const handleDataChange = (
    type: 'item' | 'total', 
    value: string | number, 
    index: number = 0, 
    field: 'name' | 'quantity' | 'price' = 'name'
  ) => {
    if (!billData) return;
    setBillData(prevData => {
        if (!prevData) return null;
        if (type === 'total') {
            return { ...prevData, total: value };
        } else {
            const newItems = [...prevData.items];
            const updatedItem = { ...newItems[index], [field]: value };
            newItems[index] = updatedItem;
            return { ...prevData, items: newItems };
        }
    });
  };

  const handleFormatChange = (
    type: 'item' | 'total',
    format: 'Bold' | 'Italic' | 'Underline',
    index: number = 0,
    field: string
  ) => {
    if (!billData) return;
    setBillData(prevData => {
      if (!prevData) return null;
      // FIX: Replaced `typeof item` with `BillItem` to resolve a scoping issue where `item` was not defined.
      const key = `${field}${format}` as keyof BillItem | keyof typeof prevData;

      if (type === 'total') {
        const newTotalFormatState = { ...prevData, [key]: !prevData[key as keyof typeof prevData] };
        return newTotalFormatState;
      } else {
        const newItems = [...prevData.items];
        const item = { ...newItems[index] };
        const newFormatState = { ...item, [key]: !item[key as keyof typeof item] };
        newItems[index] = newFormatState;
        return { ...prevData, items: newItems };
      }
    });
  };

  const handleEditToggle = () => {
    if (!isEditing) {
        setTempRotation(rotation);
        setTempBrightness(brightness);
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

        const rad = tempRotation * Math.PI / 180;
        const w = img.width;
        const h = img.height;

        const newWidth = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
        const newHeight = Math.abs(h * Math.cos(rad)) + Math.abs(w * Math.sin(rad));
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.filter = `brightness(${tempBrightness})`;
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -w / 2, -h / 2);

        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        setRotation(tempRotation);
        setBrightness(tempBrightness);
        setIsEditing(false);
    };
  };
  
  const EditorPanel = () => (
    <div className="p-4 bg-gray-700 rounded-lg h-full flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Image Editor</h3>
        <div className="space-y-6 flex-grow">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <ArrowUturnLeftIcon className="w-5 h-5" /> Rotation: {tempRotation}°
                </label>
                <div className="flex gap-2">
                    <button onClick={() => setTempRotation(r => (r - 90) % 360)} className="flex-1 bg-gray-800 hover:bg-gray-600 text-sm py-2 rounded">Rotate -90°</button>
                    <button onClick={() => setTempRotation(r => (r + 90) % 360)} className="flex-1 bg-gray-800 hover:bg-gray-600 text-sm py-2 rounded">Rotate +90°</button>
                </div>
            </div>
            <div>
                <label htmlFor="brightness" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <SunIcon className="w-5 h-5"/> Brightness: {Math.round(tempBrightness * 100)}%
                </label>
                <input
                    id="brightness"
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={tempBrightness}
                    onChange={e => setTempBrightness(parseFloat(e.target.value))}
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

  const BillResultDisplay = () => {
    if (!billData) return <p className="text-gray-500 text-center p-4">Scanned details will appear here...</p>;
    
    const FormattingToolbar: React.FC<{
        type: 'item' | 'total',
        index?: number,
        field: string,
        formatting: any
    }> = ({ type, index = 0, field, formatting }) => (
        <div className="absolute -top-8 right-0 flex items-center bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10">
            {(['Bold', 'Italic', 'Underline'] as const).map(format => {
                const Icon = { Bold: BoldIcon, Italic: ItalicIcon, Underline: UnderlineIcon }[format];
                const key = `${field}${format}`;
                const isActive = formatting && formatting[key];
                return (
                    <button
                        key={format}
                        onMouseDown={(e) => e.preventDefault()} // Prevents input from losing focus
                        onClick={() => handleFormatChange(type, format, index, field)}
                        className={`p-1.5 ${isActive ? 'text-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'} transition-colors`}
                    >
                        <Icon className="w-4 h-4" />
                    </button>
                );
            })}
        </div>
    );
    
    return (
      <div className="p-4 bg-gray-700 rounded-lg h-full overflow-y-auto" onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setActiveField(null);
        }
      }}>
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Extracted Bill Details</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 uppercase pb-2 border-b border-gray-600">
            <span className="col-span-2">Item</span>
            <span className="text-center">Qty</span>
            <span className="col-span-2 text-right">Price</span>
          </div>
          {billData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2 relative">
                <input type="text" value={item.name} 
                  onFocus={() => setActiveField({type: 'item', index, field: 'name'})}
                  onChange={e => handleDataChange('item', e.target.value, index, 'name')} 
                  className={`bg-gray-800 rounded px-2 py-1 text-sm w-full border border-transparent focus:border-blue-500 focus:ring-0
                    ${item.nameBold ? 'font-bold' : ''} ${item.nameItalic ? 'italic' : ''} ${item.nameUnderline ? 'underline' : ''}`} />
                {activeField?.type === 'item' && activeField.index === index && activeField.field === 'name' &&
                  <FormattingToolbar type="item" index={index} field="name" formatting={item} />
                }
              </div>
              <div className="relative">
                <input type="text" value={item.quantity} 
                  onFocus={() => setActiveField({type: 'item', index, field: 'quantity'})}
                  onChange={e => handleDataChange('item', e.target.value, index, 'quantity')} 
                  className={`bg-gray-800 rounded px-2 py-1 text-sm text-center w-full border border-transparent focus:border-blue-500 focus:ring-0
                    ${item.quantityBold ? 'font-bold' : ''} ${item.quantityItalic ? 'italic' : ''} ${item.quantityUnderline ? 'underline' : ''}`} />
                {activeField?.type === 'item' && activeField.index === index && activeField.field === 'quantity' &&
                  <FormattingToolbar type="item" index={index} field="quantity" formatting={item} />
                }
              </div>
              <div className="col-span-2 relative">
                <input type="text" value={item.price} 
                  onFocus={() => setActiveField({type: 'item', index, field: 'price'})}
                  onChange={e => handleDataChange('item', e.target.value, index, 'price')} 
                  className={`bg-gray-800 rounded px-2 py-1 text-sm text-right w-full border border-transparent focus:border-blue-500 focus:ring-0
                    ${item.priceBold ? 'font-bold' : ''} ${item.priceItalic ? 'italic' : ''} ${item.priceUnderline ? 'underline' : ''}`} />
                {activeField?.type === 'item' && activeField.index === index && activeField.field === 'price' &&
                  <FormattingToolbar type="item" index={index} field="price" formatting={item} />
                }
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-600 flex justify-end items-center gap-4">
          <span className="text-lg font-bold text-gray-300">Total:</span>
          <div className="relative">
            <input type="text" value={billData.total} 
              onFocus={() => setActiveField({type: 'total', index: 0, field: 'total'})}
              onChange={e => handleDataChange('total', e.target.value)} 
              className={`bg-gray-800 rounded px-2 py-1 text-lg font-bold text-right w-32 border border-transparent focus:border-blue-500 focus:ring-0
                ${billData.totalBold ? 'font-bold' : ''} ${billData.totalItalic ? 'italic' : ''} ${billData.totalUnderline ? 'underline' : ''}`} />
              {activeField?.type === 'total' &&
                  <FormattingToolbar type="total" field="total" formatting={billData} />
              }
          </div>
        </div>
      </div>
    );
  };
  
  const OcrResultDisplay = () => {
    const [copied, setCopied] = useState(false);
    if (!ocrText) return <p className="text-gray-500 text-center p-4">Extracted text will appear here...</p>;

    const handleCopy = () => {
        if (ocrText) {
          navigator.clipboard.writeText(ocrText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
    };
    
    return (
        <div className="p-4 bg-gray-700 rounded-lg h-full flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-200">Extracted Text</h3>
            <button onClick={handleCopy} className="flex items-center gap-2 text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
              {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            value={ocrText}
            className="w-full flex-grow bg-gray-800 rounded p-2 text-sm text-gray-300 border border-gray-600 resize-none"
            placeholder="No text extracted."
          />
        </div>
    );
  };

  const ResultsDisplay = () => {
    if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error) {
      return (
        <div className="p-4 bg-red-900/20 rounded-lg h-full flex flex-col justify-center text-center">
          <h3 className="text-lg font-semibold mb-2 text-red-300">Analysis Failed</h3>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <div className="text-left text-xs text-gray-400 border-t border-red-500/30 pt-3 mt-3 space-y-1">
            <h4 className="font-semibold text-gray-300 mb-2">Troubleshooting Tips:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure the image is clear and not blurry.</li>
              <li>Use the "Edit Image" tool to improve brightness.</li>
              <li>Ensure the document is upright using the rotate tool.</li>
              <li>Try taking a new photo in a well-lit area.</li>
            </ul>
          </div>
        </div>
      );
    }
    
    return scanMode === 'bill' ? <BillResultDisplay /> : <OcrResultDisplay />;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <DocumentTextIcon className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Document Scanner</h2>
      </div>
       <div className="mb-6 flex justify-center p-1 rounded-lg bg-gray-900/50 max-w-sm mx-auto">
        <button
          onClick={() => setScanMode('bill')}
          className={`px-4 py-2 text-sm font-semibold rounded-md w-1/2 transition-colors ${scanMode === 'bill' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          Scan Bill
        </button>
        <button
          onClick={() => setScanMode('ocr')}
          className={`px-4 py-2 text-sm font-semibold rounded-md w-1/2 transition-colors ${scanMode === 'ocr' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          Extract Text (OCR)
        </button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className={scanMode === 'bill' ? 'md:col-span-2' : 'md:col-span-3'}>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50 h-full">
                    {!image ? (
                    <div className="text-center">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-500" />
                        <label htmlFor="file-upload" className="relative cursor-pointer mt-4 rounded-md font-semibold text-blue-500 hover:text-blue-400">
                        <span>Upload a document</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <p className="text-xs leading-5 text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    ) : (
                    <div className="w-full flex flex-col h-full">
                        <img 
                        src={image} 
                        alt="Uploaded document" 
                        className="w-full h-auto max-h-80 object-contain rounded-lg shadow-md flex-grow"
                        style={{
                            transform: isEditing ? `rotate(${tempRotation}deg)` : `rotate(${rotation}deg)`,
                            filter: isEditing ? `brightness(${tempBrightness})` : `brightness(${brightness})`,
                            transition: 'transform 0.2s, filter 0.2s',
                        }}
                        />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={handleScan} disabled={isLoading || isHistoryView || isEditing} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {isLoading ? <><Spinner /> Analyzing...</> : <><SparklesIcon className="w-5 h-5" /> {scanMode === 'bill' ? 'Scan Bill' : 'Extract Text'}</>}
                        </button>
                        <button onClick={handleEditToggle} disabled={isHistoryView || !originalImage} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            <PencilSquareIcon className="w-5 h-5" /> {isEditing ? 'Cancel Edit' : 'Edit Image'}
                        </button>
                        <button onClick={handleDownloadImage} disabled={isEditing} className="col-span-2 w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed">
                            <ArrowDownTrayIcon className="w-5 h-5" /> Download Image
                        </button>
                        </div>
                    </div>
                    )}
                </div>
                
                <div className="flex flex-col min-h-[400px]">
                    {isEditing ? <EditorPanel /> : <ResultsDisplay />}
                </div>
            </div>
        </div>

        {scanMode === 'bill' && (
            <div className="md:col-span-1 bg-gray-900/50 rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-6 h-6 text-gray-400"/>
                        <h3 className="text-lg font-semibold text-white">Scan History</h3>
                    </div>
                    <button onClick={handleClearHistory} disabled={history.length === 0 || isClearing} className="p-1.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="overflow-y-auto space-y-2 flex-grow">
                    {history.length === 0 && !isClearing ? (
                        <p className="text-sm text-gray-500 text-center pt-10">No recent scans.</p>
                    ) : (
                        history.map((item, index) => (
                            <button 
                                key={item.id} 
                                onClick={() => handleHistoryClick(item)} 
                                className={`w-full flex items-center gap-3 p-2 rounded-lg bg-gray-700 text-left transition-all duration-300 ease-in-out transform focus:outline-none
                                    hover:bg-gray-600 hover:shadow-lg hover:scale-[1.03]
                                    ${selectedHistoryId === item.id ? 'bg-blue-800 scale-[1.03] ring-2 ring-blue-500 shadow-xl' : 'hover:bg-gray-600'}
                                    ${isClearing ? 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0'}`
                                }
                                style={{ transitionDelay: `${isClearing ? index * 50 : 0}ms` }}
                            >
                                <img src={item.imageDataUrl} alt="bill thumbnail" className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-gray-800 border border-gray-600" />
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-gray-200 truncate">{item.billData.items[0]?.name || 'Scan'}</p>
                                    <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default BillScanner;