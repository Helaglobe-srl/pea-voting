'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Square, Trash2 } from 'lucide-react';

interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  language?: string;
  durationInSeconds?: number;
  warnings?: string[];
}

export function TranscriptionTest() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        
        // create file from blob for transcription
        const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        setFile(file);
        
        // stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
      setResult(null);

      // start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('failed to access microphone. please check permissions.');
      console.error('microphone access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (recordedBlob) {
      const audioUrl = URL.createObjectURL(recordedBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    setRecordedBlob(null);
    setFile(null);
    setRecordingTime(0);
    setResult(null);
    stopPlayback();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // check if file is audio
      if (!selectedFile.type.startsWith('audio/')) {
        setError('please select an audio file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
      // clear recording when file is selected
      setRecordedBlob(null);
      setRecordingTime(0);
      stopPlayback();
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('please select an audio file or record audio first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'transcription failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'an error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>audio transcription test</CardTitle>
          <CardDescription>
            upload an audio file or record audio directly to test the vercel ai sdk transcription feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audio-file">upload audio file</Label>
            <Input
              id="audio-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isLoading || isRecording}
            />
            {file && !recordedBlob && (
              <p className="text-sm text-muted-foreground">
                selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} mb)
              </p>
            )}
          </div>

          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">or</div>
          </div>

          <div className="space-y-4">
            <Label>record audio</Label>
            
            {/* recording controls */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Mic className="h-4 w-4" />
                  start recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  stop recording
                </Button>
              )}

              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>

            {/* recorded audio controls */}
            {recordedBlob && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">recorded audio ready</Badge>
                  <span className="text-sm text-muted-foreground">
                    duration: {formatTime(recordingTime)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isPlaying ? (
                    <Button
                      onClick={playRecording}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      play
                    </Button>
                  ) : (
                    <Button
                      onClick={stopPlayback}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      stop
                    </Button>
                  )}
                  
                  <Button
                    onClick={clearRecording}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleTranscribe} 
            disabled={!file || isLoading || isRecording}
            className="w-full"
          >
            {isLoading ? 'transcribing...' : 'transcribe audio'}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>transcription result</CardTitle>
            {result.language && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">language: {result.language}</Badge>
                {result.durationInSeconds && (
                  <Badge variant="secondary">
                    duration: {formatTime(result.durationInSeconds)}
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>full transcript</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <p className="text-sm">{result.text}</p>
              </div>
            </div>

            {result.segments && result.segments.length > 0 && (
              <div>
                <Label>segments with timestamps</Label>
                <div className="mt-2 space-y-2">
                  {result.segments.map((segment, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-muted rounded-lg flex items-start gap-3"
                    >
                      <Badge variant="outline" className="text-xs shrink-0">
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </Badge>
                      <p className="text-sm">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div>
                <Label>warnings</Label>
                <div className="mt-2 space-y-1">
                  {result.warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
