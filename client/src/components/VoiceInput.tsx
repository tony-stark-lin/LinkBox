import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
  onResult: (text: string) => void;
  lang?: string;
}

// Check browser support
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const speechSupported = !!SpeechRecognition;

export default function VoiceInput({ onResult, lang = 'zh-CN' }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
      return;
    }

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) {
        onResult(finalText);
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setListening(false);
        setInterim('');
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognition.start();
    setListening(true);
  };

  if (!speechSupported) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={toggle}
        className={`p-1.5 rounded-lg transition-colors ${
          listening
            ? 'bg-red-100 dark:bg-red-900/40 text-red-500 animate-pulse'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600'
        }`}
        title={listening ? '停止录音' : '语音输入'}>
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {interim && (
        <span className="text-xs text-gray-400 italic max-w-[200px] truncate">{interim}</span>
      )}
    </span>
  );
}
