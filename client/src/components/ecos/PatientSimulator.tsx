import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, User, Bot, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VoiceCommand } from "@/components/VoiceCommand";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface PatientSimulatorProps {
  sessionId: number;
  email: string;
  onSessionEnd: () => void;
}

export default function PatientSimulator({ sessionId, email, onSessionEnd }: PatientSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'completed' | 'error'>('active');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [scenarioDuration, setScenarioDuration] = useState<number>(20); // Default 20 minutes

  // Initialize with welcome message and fetch scenario data
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: "Bonjour ! Je suis votre patient virtuel. Vous pouvez commencer votre évaluation en me posant des questions ou en effectuant des examens. Comment puis-je vous aider aujourd'hui ?",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setStartTime(new Date());

    // Fetch scenario duration
    const fetchScenarioData = async () => {
      try {
        const response = await fetch(`/api/ecos/sessions/${sessionId}/scenario`);
        if (response.ok) {
          const data = await response.json();
          const duration = data.scenario?.duration || 20;
          setScenarioDuration(duration);
          setTimeRemaining(duration * 60); // Convert minutes to seconds
        }
      } catch (error) {
        console.log('Could not fetch scenario duration, using default');
        setTimeRemaining(scenarioDuration * 60);
      }
    };

    fetchScenarioData();

  }, []);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timeRemaining !== null && timeRemaining > 0 && sessionStatus === 'active') {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setSessionStatus('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRemaining, sessionStatus]);

  // Fonction pour envoyer un message à l'API
  const sendMessageToAPI = async (messageContent: string) => {
    try {
      console.log('Sending message to ECOS chat:', messageContent);

      // Call the actual ECOS chat endpoint
      const response = await fetch('/api/ecos/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId: sessionId,
          conversationHistory: messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ECOS response received:', data);

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Désolé, je n\'ai pas pu générer une réponse.',
        sender: 'bot',
        timestamp: new Date(),
      };

      // Add typing delay for more realistic feel
      setTimeout(async () => {
        setMessages(prev => [...prev, botResponse]);
        setProgress(prev => Math.min(prev + 10, 100));
        setIsLoading(false);

      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setSessionStatus('error');

      // Add error message for user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Désolé, une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    await sendMessageToAPI(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const getStatusIcon = () => {
    switch (sessionStatus) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case 'active':
        return 'Session en cours';
      case 'completed':
        return 'Session terminée';
      case 'error':
        return 'Erreur de session';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
      {/* Header */}
      <Card className="w-full">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">Simulation Patient ECOS</CardTitle>
            <div className="flex items-center space-x-4">
              {timeRemaining !== null && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className={`text-sm font-mono font-bold ${
                    timeRemaining < 300 ? 'text-red-600' : timeRemaining < 600 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-xs sm:text-sm text-gray-600">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span>Progression de l'évaluation</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            {timeRemaining !== null && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span>Temps restant</span>
                <span className={`font-bold ${
                  timeRemaining < 300 ? 'text-red-600' : timeRemaining < 600 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {formatTime(timeRemaining)} / {scenarioDuration} min
                </span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col px-3 sm:px-6 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-sm leading-relaxed break-words">{message.content}</p>
                      <span className="text-xs opacity-75 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-3 sm:my-4" />

          {/* Input Area */}
          <div className="space-y-3">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Rédigez votre message ou utilisez la commande vocale pour interagir directement avec le patient."
              className="min-h-[80px] sm:min-h-[100px] resize-none text-base"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
              disabled={isLoading || sessionStatus !== 'active'}
            />
            
            {/* Voice Command Component */}
            <div className="flex justify-center py-2">
              <VoiceCommand 
                userId={email}
                scenarioId={sessionId.toString()}
                sessionType="ecos_simulation"
                onTranscript={(text, isUser) => {
                  // Ajouter tous les messages (utilisateur et IA) via la transcription
                  const message: Message = {
                    id: `${Date.now()}-${Math.random()}`,
                    content: text,
                    sender: isUser ? 'user' : 'bot',
                    timestamp: new Date()
                  };
                  
                  setMessages(prev => {
                    // Éviter les doublons en vérifiant le contenu et l'expéditeur
                    const isDuplicate = prev.some(msg => 
                      msg.content === text && 
                      msg.sender === message.sender &&
                      Math.abs(msg.timestamp.getTime() - message.timestamp.getTime()) < 2000
                    );
                    
                    if (isDuplicate) {
                      return prev;
                    }
                    
                    return [...prev, message];
                  });
                }}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2 overflow-x-auto">
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  Session #{sessionId}
                </Badge>
                <Badge variant="outline" className="text-xs whitespace-nowrap truncate max-w-[150px] sm:max-w-none">
                  {email}
                </Badge>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSessionEnd}
                  disabled={isLoading}
                  className="hidden sm:flex"
                >
                  Terminer la session
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSessionEnd}
                  disabled={isLoading}
                  className="sm:hidden px-2"
                >
                  Terminer
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || sessionStatus !== 'active'}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Envoyer</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}