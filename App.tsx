
import React, { useState, useCallback } from 'react';
import BillScanner from './components/BillScanner';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import Chatbot from './components/Chatbot';
import { SparklesIcon, DocumentTextIcon, PhotoIcon, PaintBrushIcon, ChatBubbleLeftRightIcon } from './components/IconComponents';

type Tool = 'scanner' | 'generator' | 'editor' | 'chat';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>('scanner');

  const renderTool = useCallback(() => {
    switch (activeTool) {
      case 'scanner':
        return <BillScanner />;
      case 'generator':
        return <ImageGenerator />;
      case 'editor':
        return <ImageEditor />;
      case 'chat':
        return <Chatbot />;
      default:
        return <BillScanner />;
    }
  }, [activeTool]);

  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  const NavButton: React.FC<{ tool: Tool; label: string; icon: React.ReactElement }> = ({ tool, label, icon }) => (
    <button
      onClick={() => setActiveTool(tool)}
      className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left ${
        activeTool === tool
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-xs sm:text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-900 text-gray-100 font-sans">
      <header className="md:w-64 bg-gray-800 p-4 shadow-lg md:flex md:flex-col">
        <div className="flex items-center gap-3 mb-6">
          <SparklesIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Gemini Multi-Tool</h1>
        </div>
        <nav className="flex md:flex-col justify-around md:justify-start md:gap-2">
          <NavButton tool="scanner" label="Bill Scanner" icon={<DocumentTextIcon className="w-5 h-5" />} />
          <NavButton tool="generator" label="Image Generator" icon={<PhotoIcon className="w-5 h-5" />} />
          <NavButton tool="editor" label="Image Editor" icon={<PaintBrushIcon className="w-5 h-5" />} />
          <NavButton tool="chat" label="AI Chat" icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />} />
        </nav>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderTool()}
      </main>
    </div>
  );
};

export default App;
