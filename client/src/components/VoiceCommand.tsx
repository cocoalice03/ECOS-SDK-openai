import React, { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';

interface VoiceCommandProps {
  userId: string;
  scenarioId?: string;
  sessionType?: 'chat' | 'ecos_simulation';
  onTranscript?: (text: string, isUser: boolean) => void;
}

export function VoiceCommand({ 
  userId, 
  scenarioId, 
  sessionType = 'chat',
  onTranscript 
}: VoiceCommandProps) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const startVoice = async () => {
    try {
      setStatus('connecting');
      
      // 1) Auth éphémère depuis le backend
      const response = await fetch("/api/rtc-token", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId, sessionType })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get auth token');
      }
      
      const { client_secret, instructions } = await response.json();

      // 2) Prépare WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      
      // Voix de l'IA
      pc.ontrack = (e) => { 
        const audioElement = document.getElementById("ai-audio") as HTMLAudioElement;
        if (audioElement && e.streams[0]) {
          audioElement.srcObject = e.streams[0];
        }
      };
      
      // Texte / events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      
      dc.onmessage = (e) => {
        // Affiche les transcriptions & deltas texte
        try {
          const msg = JSON.parse(e.data);
          console.log("EVENT", msg.type, msg);
          
          // Transcription de l'utilisateur (ce que vous dites)
          if (msg.type === "conversation.item.input_audio_transcription.completed") {
            const text = msg.transcript;
            if (text && onTranscript) {
              onTranscript(text, true); // true = utilisateur
            }
          }
          
          // Transcription alternative pour l'utilisateur
          if (msg.type === "input_audio_buffer.speech_started" || msg.type?.includes("input_audio_transcription")) {
            if (msg.transcript && onTranscript) {
              onTranscript(msg.transcript, true);
            }
          }
          
          // Réponse de l'IA (texte)
          if (msg.type === "response.text.delta" || msg.type === "response.output_text.delta") {
            if (msg.delta && onTranscript) {
              onTranscript(msg.delta, false); // false = IA
            }
          }
          
          // Réponse complète de l'IA
          if (msg.type === "response.text.done" || msg.type === "response.output_text.done") {
            if (msg.text && onTranscript) {
              onTranscript(msg.text, false);
            }
          }
          
          // Gestion générique des transcriptions
          if (msg.type?.includes("transcript") && msg.transcript && onTranscript) {
            const isUser = msg.type.includes("input") || msg.type.includes("user");
            onTranscript(msg.transcript, isUser);
          }
          
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      // 3) Ajoute le micro en entrée
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = micStream;
      
      micStream.getTracks().forEach(t => pc.addTrack(t, micStream));

      // 4) Offre SDP locale
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // 5) Échange SDP avec l'API Realtime
      const rtcResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client_secret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      
      if (!rtcResponse.ok) {
        throw new Error(`Realtime API error: ${rtcResponse.statusText}`);
      }
      
      const answerSdp = await rtcResponse.text();
      const answer = { type: "answer" as RTCSdpType, sdp: answerSdp };
      await pc.setRemoteDescription(answer);

      // Envoyer les instructions système via data channel
      dc.onopen = () => {
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: instructions,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              silence_duration_ms: 500
            }
          }
        }));
      };

      setStatus('connected');
      setIsActive(true);
      
    } catch (error) {
      console.error('Error starting voice:', error);
      setStatus('error');
      setIsActive(false);
    }
  };

  const stopVoice = () => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    
    setStatus('idle');
    setIsActive(false);
  };

  const handleClick = async () => {
    if (!isActive) {
      await startVoice();
    } else {
      stopVoice();
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'connecting': return '🔄 Connexion...';
      case 'connected': return '⏹️ Stop';
      case 'error': return '❌ Erreur';
      default: return '🎙️ Activer la commande vocale';
    }
  };

  const getButtonVariant = () => {
    switch (status) {
      case 'connected': return 'destructive' as const;
      case 'error': return 'outline' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Button 
        onClick={handleClick}
        variant={getButtonVariant()}
        size="lg"
        disabled={status === 'connecting'}
        className="min-w-[200px]"
      >
        {isActive ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
        {getButtonText()}
      </Button>
      
      {/* Audio element pour la voix de l'IA */}
      <audio id="ai-audio" autoPlay className="hidden" />
      
      {status === 'error' && (
        <p className="text-sm text-red-600">
          Erreur de connexion. Vérifiez votre microphone et réessayez.
        </p>
      )}
      
      {status === 'connected' && (
        <p className="text-sm text-green-600">
          🎤 Parlez maintenant - l'IA vous écoute et répondra à voix haute
        </p>
      )}
    </div>
  );
}
