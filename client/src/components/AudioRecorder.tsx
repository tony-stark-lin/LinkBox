import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Upload } from 'lucide-react';

interface Props {
  onRecorded: (blob: Blob) => void;
}

// Check if secure context (HTTPS or localhost) - required for getUserMedia
const isSecureContext = typeof window !== 'undefined' && (
  window.isSecureContext ||
  location.protocol === 'https:' ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'
);

// Detect best supported audio mimeType
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    '',
  ];
  for (const mime of candidates) {
    if (mime === '') return '';
    try { if (MediaRecorder.isTypeSupported(mime)) return mime; } catch { /* ignore */ }
  }
  return '';
}

const supportedMime = getSupportedMimeType();
const recorderAvailable = isSecureContext &&
  typeof MediaRecorder !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function';

export default function AudioRecorder({ onRecorded }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startTime = useRef(0);
  const mimeUsed = useRef('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorder.current?.state === 'recording') {
        mediaRecorder.current.stop();
      }
    };
  }, [audioUrl]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Handle file input (native recording fallback or file selection)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(url);
    setFileName(file.name);
    onRecorded(file);
    setState('recorded');

    // Try to get duration
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });
  };

  const startRecording = async () => {
    if (!recorderAvailable) {
      // This shouldn't happen because idle UI already shows file input fallback
      // But just in case:
      fileInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const options: MediaRecorderOptions = {};
      if (supportedMime) options.mimeType = supportedMime;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorder.current = recorder;
      mimeUsed.current = recorder.mimeType || supportedMime || 'audio/webm';
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: mimeUsed.current });
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        setFileName('');
        onRecorded(blob);
        setState('recorded');
      };

      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = 0; }
        setErrorMsg('录音出错，请重试');
        setState('error');
      };

      recorder.start(1000);
      startTime.current = Date.now();
      setDuration(0);
      setErrorMsg('');
      timerRef.current = window.setInterval(() => {
        setDuration((Date.now() - startTime.current) / 1000);
      }, 200);
      setState('recording');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('麦克风权限被拒绝，请在浏览器设置中允许');
      } else {
        setErrorMsg('无法访问麦克风: ' + (err.message || '未知错误'));
      }
      setState('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = 0; }
    mediaRecorder.current?.stop();
  };

  const discard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setDuration(0);
    setPlaying(false);
    setErrorMsg('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setState('idle');
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // Hidden file input - always present for fallback
  const fileInput = (
    <input ref={fileInputRef} type="file" accept="audio/*" capture="environment"
      className="hidden" onChange={handleFileSelect} />
  );

  // Error state
  if (state === 'error') {
    return (
      <div className="p-4 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg text-center">
        {fileInput}
        <p className="text-sm text-red-500 mb-2">{errorMsg}</p>
        <div className="flex gap-2 justify-center">
          <button type="button" onClick={discard}
            className="text-xs text-gray-500 hover:text-gray-700">重试</button>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
            <Upload className="w-3 h-3" /> 选择音频文件
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  if (state === 'idle') {
    // If MediaRecorder is available (HTTPS), show record button
    // If not (HTTP), show native file input with capture (triggers system recorder)
    if (recorderAvailable) {
      return (
        <div className="space-y-2">
          {fileInput}
          <button type="button" onClick={startRecording}
            className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors">
            <Mic className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm">点击开始录音</span>
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-1">
            <Upload className="w-3 h-3" /> 或选择音频文件
          </button>
        </div>
      );
    }

    // Fallback: native capture + file picker (works on HTTP)
    return (
      <div className="space-y-2">
        {fileInput}
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors">
          <Mic className="w-8 h-8 mx-auto mb-2" />
          <span className="text-sm block">点击录音或选择音频文件</span>
          <span className="text-xs text-gray-300 dark:text-gray-500 block mt-1">
            当前为 HTTP 环境，将调用系统录音
          </span>
        </button>
      </div>
    );
  }

  // Recording state
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        {fileInput}
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">
          录音中 {formatTime(duration)}
        </span>
        <button type="button" onClick={stopRecording}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
          <Square className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Recorded state
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {fileInput}
      <audio ref={audioRef} src={audioUrl}
        onEnded={() => setPlaying(false)} className="hidden" />
      <button type="button" onClick={togglePlay}
        className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors shrink-0">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {fileName || `录音 ${formatTime(duration)}`}
        </span>
      </div>
      <button type="button" onClick={discard}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
