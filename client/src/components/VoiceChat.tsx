import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface VoiceChatProps {
  userId: string;
  scenarioId?: string;
  sessionType?: 'chat' | 'ecos_simulation';
  onTranscript?: (text: string, isUser: boolean) => void;
  onStateChange?: (state: VoiceChatState) => void;
}

type VoiceChatState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface RTCToken {
  token: string;
  sessionId: string;
  expiresAt: string;
  config: {
    sampleRate: number;
    channels: number;
    format: string;
  };
}

export function VoiceChat({ 
  userId, 
  scenarioId, 
  sessionType = 'chat',
  onTranscript,
  onStateChange 
}: VoiceChatProps) {
  const [state, setState] = useState<VoiceChatState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOutputMuted, setIsOutputMuted] = useState(false);
  const [transcript, setTranscript] = useState<Array<{text: string, isUser: boolean, timestamp: Date}>>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs pour WebRTC et audio
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioOutputRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Configuration WebRTC
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const addTranscript = useCallback((text: string, isUser: boolean) => {
    const entry = { text, isUser, timestamp: new Date() };
    setTranscript(prev => [...prev, entry]);
    onTranscript?.(text, isUser);
  }, [onTranscript]);

  // Obtenir un token RTC
  const getRTCToken = async (): Promise<RTCToken> => {
    const response = await fetch('/api/rtc-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, scenarioId, sessionType })
    });

    if (!response.ok) {
      throw new Error(`Failed to get RTC token: ${response.statusText}`);
    }

    return response.json();
  };

  // Initialiser la capture audio
  const initializeAudio = async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        }
      });

      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error}`);
    }
  };

  // Créer la connexion WebRTC
  const createPeerConnection = async (token: RTCToken): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = pc;

    // Créer un data channel pour les événements
    const dataChannel = pc.createDataChannel('events', { ordered: true });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened');
      // Envoyer la configuration initiale
      dataChannel.send(JSON.stringify({
        type: 'session_update',
        session: { token: token.token }
      }));
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    // Gérer les tracks audio entrants
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.track.kind === 'audio') {
        const audioElement = new Audio();
        audioElement.srcObject = event.streams[0];
        audioElement.autoplay = true;
        audioElement.muted = isOutputMuted;
        audioOutputRef.current = audioElement;
      }
    };

    // Gérer les changements d'état de connexion
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          updateState('connected');
          break;
        case 'disconnected':
        case 'failed':
          updateState('error');
          setError('Connection lost');
          break;
      }
    };

    return pc;
  };

  // Gérer les événements de l'API Realtime
  const handleRealtimeEvent = (event: any) => {
    switch (event.type) {
      case 'response.audio_transcript.delta':
        // Transcript partiel de la réponse IA
        break;
        
      case 'response.audio_transcript.done':
        // Transcript complet de la réponse IA
        if (event.transcript) {
          addTranscript(event.transcript, false);
        }
        updateState('listening');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // Transcript de l'audio utilisateur
        if (event.transcript) {
          addTranscript(event.transcript, true);
        }
        break;
        
      case 'response.audio.delta':
        // Audio de réponse (déjà géré par WebRTC)
        updateState('speaking');
        break;
        
      case 'input_audio_buffer.speech_started':
        updateState('listening');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        updateState('connected');
        break;
        
      case 'error':
        updateState('error');
        setError(event.error?.message || 'Unknown error');
        break;
    }
  };

  // Démarrer la conversation vocale
  const startVoiceChat = async () => {
    try {
      updateState('connecting');
      setError(null);

      // 1. Obtenir le token RTC
      const token = await getRTCToken();
      
      // 2. Initialiser l'audio
      const stream = await initializeAudio();
      
      // 3. Créer la connexion WebRTC
      const pc = await createPeerConnection(token);
      
      // 4. Ajouter le stream local
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // 5. Créer et envoyer l'offre
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);
      
      // 6. Échanger l'offre avec l'API Realtime via WebSocket
      // (Ici on simule, en réalité il faudrait une connexion WebSocket avec OpenAI)
      console.log('SDP Offer:', offer.sdp);
      
      updateState('connected');
      
    } catch (error) {
      console.error('Error starting voice chat:', error);
      updateState('error');
      setError(error instanceof Error ? error.message : 'Failed to start voice chat');
    }
  };

  // Arrêter la conversation vocale
  const stopVoiceChat = () => {
    // Fermer les connexions
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Arrêter les streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Nettoyer l'audio
    if (audioOutputRef.current) {
      audioOutputRef.current.pause();
      audioOutputRef.current = null;
    }
    
    updateState('idle');
  };

  // Toggle mute du microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  // Toggle mute de la sortie audio
  const toggleOutputMute = () => {
    if (audioOutputRef.current) {
      audioOutputRef.current.muted = !isOutputMuted;
      setIsOutputMuted(!isOutputMuted);
    }
  };

  // Cleanup à la fermeture
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  const getStateColor = (state: VoiceChatState) => {
    switch (state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'speaking': return 'bg-blue-500';
      case 'listening': return 'bg-purple-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStateText = (state: VoiceChatState) => {
    switch (state) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion...';
      case 'speaking': return 'IA parle';
      case 'listening': return 'Écoute';
      case 'error': return 'Erreur';
      default: return 'Inactif';
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {sessionType === 'ecos_simulation' ? 'Simulation Vocale ECOS' : 'Chat Vocal'}
        </h3>
        <Badge className={getStateColor(state)}>
          {getStateText(state)}
        </Badge>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-center space-x-4">
        {state === 'idle' ? (
          <Button 
            onClick={startVoiceChat}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <Phone className="w-5 h-5 mr-2" />
            Démarrer la conversation
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={toggleOutputMute}
              variant={isOutputMuted ? "destructive" : "outline"}
              size="lg"
            >
              {isOutputMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={stopVoiceChat}
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Raccrocher
            </Button>
          </>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700">Transcription:</h4>
          {transcript.map((entry, index) => (
            <div 
              key={index}
              className={`p-2 rounded text-sm ${
                entry.isUser 
                  ? 'bg-blue-50 border-l-4 border-blue-400 ml-4' 
                  : 'bg-gray-50 border-l-4 border-gray-400 mr-4'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={entry.isUser ? 'text-blue-800' : 'text-gray-800'}>
                  {entry.text}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
