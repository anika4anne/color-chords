"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const noteFreqs = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
};

const swatchColors = [
  "#FF6B6B", // red
  "#FFB347", // orange
  "#FFFF66", // yellow
  "#90EE90", // green
  "#87CEEB", // blue
  "#DA70D6", // purple
];

let ctx: AudioContext | null = null;

export default function ColorChords() {
  const [gameStarted, setGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorOptions, setColorOptions] = useState<number[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [showBarGraph, setShowBarGraph] = useState(false);
  const [colorHistory, setColorHistory] = useState<number[]>([
    0, 0, 0, 0, 0, 0,
  ]);

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
    for (let i = 0; i < 6; i++) {
      indices.push(i);
    }
    indices.sort(() => Math.random() - 0.5);

    setCorrectIndex(randomNoteIndex);
    setIsPlaying(true);

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

    console.log("Purple button - creating audio exactly like green button");
    const audio = new Audio("/mp3/shape-of-you.mp3");
    audio.volume = 1.0;
    audio.loop = true;
    gameAudioRef.current = audio;

    try {
      if (!ctx) ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      console.log("Audio analyzer setup complete");
    } catch (error) {
      console.log("Audio analyzer setup failed:", error);
    }

    audio
      .play()
      .then(() => {
        console.log("Purple button audio play successful");
        updateAudioData(); // Start the visualizer
      })
      .catch((e) => {
        console.log("Purple button audio play failed:", e);
      });

    setTimeout(() => {
      setGameStarted(true);
      beginNewRound();
    }, 100);
  }, [beginNewRound, updateAudioData]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const onSwatchClick = useCallback(
    (selectedIndex: number) => {
      setSelectedColor(selectedIndex);

      setColorHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        newHistory[selectedIndex] = (newHistory[selectedIndex] || 0) + 1;
        return newHistory;
      });

      setShowBarGraph(true);

      if (selectedIndex === correctIndex) {
        setTimeout(() => {
          setShowBarGraph(false);
          beginNewRound();
        }, 2000);
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

      {!isPlaying && colorOptions.length > 0 && !showBarGraph && (
        <div className="text-center">
          <div className="mb-12 flex items-end justify-center space-x-2">
            {audioData.map((value, index) => (
              <div
                key={index}
                className="w-4 bg-cyan-400 transition-all duration-75 ease-out"
                style={{
                  height: `${Math.max(4, value * 100)}px`,
                }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-8">
            {colorOptions.map((colorIdx, position) => {
              const isSelected = selectedColor === colorIdx;
              return (
                <div key={position} className="relative">
                  <button
                    onClick={() => onSwatchClick(colorIdx)}
                    className={`h-24 w-24 rounded-full transition-all hover:scale-110 ${
                      isSelected
                        ? "ring-opacity-90 scale-105 ring-8 ring-white"
                        : ""
                    }`}
                    style={{ backgroundColor: swatchColors[colorIdx] }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBarGraph && selectedColor !== null && (
        <div className="flex items-center justify-center space-x-8">
          <div
            className="h-24 w-24 rounded-full shadow-lg transition-all duration-500"
            style={{ backgroundColor: swatchColors[selectedColor] }}
          />
          <div className="flex flex-col space-y-3">
            {swatchColors.map((color, index) => {
              const count = colorHistory[index] || 0;
              const maxCount = Math.max(...colorHistory, 1);
              const barWidth = (count / maxCount) * 200;
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="h-4 w-52 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        backgroundColor: color,
                        width: `${barWidth}px`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
