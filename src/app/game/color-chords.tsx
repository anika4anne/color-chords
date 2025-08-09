"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const noteFreqs = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
};

const swatchColors = ["#FF6B6B", "#FFB347", "#FFFF66", "#90EE90", "#87CEEB"];

let ctx: AudioContext | null = null;

export default function ColorChords() {
  const [gameStarted, setGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorOptions, setColorOptions] = useState<number[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);
  const gameAudioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const makeSound = useCallback((frequency: number) => {
    if (!ctx) {
      ctx = new AudioContext();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 1);
  }, []);

  const beginNewRound = useCallback(() => {
    const frequencies = Object.values(noteFreqs);
    const randomNoteIndex = Math.floor(Math.random() * frequencies.length);

    const indices: number[] = [];
    for (let i = 0; i < 5; i++) {
      indices.push(i);
    }
    indices.sort(() => Math.random() - 0.5);

    setCorrectIndex(randomNoteIndex);
    setIsPlaying(true);
    // makeSound(frequencies[randomNoteIndex] || 261.63); // Removed chord sound

    setTimeout(() => {
      setColorOptions(indices);
      setIsPlaying(false);
    }, 1000);
  }, [makeSound]);

  const setupAudioAnalyser = useCallback(() => {
    if (!audioRef.current || analyserRef.current) return;

    try {
      if (!ctx) ctx = new AudioContext();

      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      analyserRef.current = analyser;
      console.log("Audio analyzer setup complete");
    } catch (error) {
      console.log("Audio analyzer setup failed:", error);
      // If analyzer fails, just play the audio normally
    }
  }, []);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const normalizedData = Array.from(dataArray).map((value) => value / 255);
    setAudioData(normalizedData.slice(0, 8));

    animationRef.current = requestAnimationFrame(updateAudioData);
  }, []);

  const startBackgroundMusic = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      setupAudioAnalyser();
      audioRef.current.volume = 0.3;
      await audioRef.current.play();
      updateAudioData();
    } catch (error) {
      console.log("Audio play failed:", error);
    }
  }, [setupAudioAnalyser, updateAudioData]);

  const startGame = useCallback(async () => {
    console.log("startGame clicked");

    // EXACTLY the same as green button - no differences at all
    console.log("Purple button - creating audio exactly like green button");
    const audio = new Audio("/mp3/shape-of-you.mp3");
    audio.volume = 1.0;
    audio.loop = true; // Only difference - add looping
    audio
      .play()
      .then(() => {
        console.log("Purple button audio play successful");
      })
      .catch((e) => {
        console.log("Purple button audio play failed:", e);
      });

    // Delay the game start to not interfere with audio
    setTimeout(() => {
      setGameStarted(true);
      beginNewRound();
    }, 100);
  }, [beginNewRound]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const onSwatchClick = useCallback(
    (selectedIndex: number) => {
      if (selectedIndex === correctIndex) {
        beginNewRound();
      } else {
        setColorOptions([]);
      }
    },
    [correctIndex, beginNewRound],
  );

  if (!gameStarted) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#0f172a" }}
      >
        <audio
          ref={audioRef}
          loop
          preload="auto"
          onError={(e) => console.log("Audio error:", e)}
          onLoadStart={() => console.log("Audio loading started")}
          onCanPlay={() => console.log("Audio can play")}
          onPlay={() => console.log("Audio is playing")}
          onPause={() => console.log("Audio paused")}
        >
          <source src="/mp3/shape-of-you.mp3" type="audio/mpeg" />
        </audio>

        <audio
          ref={backgroundMusicRef}
          loop
          preload="auto"
          onError={(e) => console.log("Background music error:", e)}
          onLoadStart={() => console.log("Background music loading started")}
          onCanPlay={() => console.log("Background music can play")}
          onPlay={() => console.log("Background music is playing")}
          onPause={() => console.log("Background music paused")}
        >
          <source src="/mp3/shape-of-you.mp3" type="audio/mpeg" />
        </audio>

        <button
          onClick={startGame}
          className="group relative h-64 w-64 rounded-full bg-gradient-to-r from-white to-gray-100 shadow-2xl transition-all duration-500 hover:scale-110"
        >
          <div className="absolute inset-8 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            <div className="ml-4 h-0 w-0 border-t-[24px] border-b-[24px] border-l-[36px] border-t-transparent border-b-transparent border-l-white"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#0f172a" }}
    >
      {isPlaying && (
        <div
          className="h-32 w-32 animate-ping rounded-full"
          style={{ backgroundColor: swatchColors[correctIndex] }}
        />
      )}

      {!isPlaying && colorOptions.length === 0 && (
        <button
          onClick={beginNewRound}
          className="group relative h-24 w-24 rounded-full bg-gradient-to-r from-white to-gray-200 shadow-xl transition-all duration-300 hover:scale-110"
        >
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            <div className="ml-1 h-0 w-0 border-t-[8px] border-b-[8px] border-l-[12px] border-t-transparent border-b-transparent border-l-white"></div>
          </div>
        </button>
      )}

      {!isPlaying && colorOptions.length > 0 && (
        <div className="text-center">
          <div className="grid grid-cols-3 gap-8">
            {colorOptions.map((colorIdx, position) => (
              <button
                key={position}
                onClick={() => onSwatchClick(colorIdx)}
                className="h-24 w-24 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: swatchColors[colorIdx] }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
