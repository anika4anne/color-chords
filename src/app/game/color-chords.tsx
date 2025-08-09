"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const musicalNotes = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
};

const gameColors = [
  "#FF6B6B",
  "#FFB347",
  "#FFFF66",
  "#90EE90",
  "#87CEEB",
  "#DA70D6",
];

let audioSystem: AudioContext | null = null;

export default function ColorChords() {
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [availableColors, setAvailableColors] = useState<number[]>([]);
  const [rightAnswerIndex, setRightAnswerIndex] = useState(0);
  const [musicVisualization, setMusicVisualization] = useState<number[]>([]);
  const [playerChoice, setPlayerChoice] = useState<number | null>(null);
  const [shouldShowResults, setShouldShowResults] = useState(false);
  const [playerVoteHistory, setPlayerVoteHistory] = useState<number[]>([
    0, 0, 0, 0, 0, 0,
  ]);
  const [allPlayerStats, setAllPlayerStats] = useState<
    Record<string, number[]>
  >({});

  const mainAudioPlayer = useRef<HTMLAudioElement>(null);
  const backgroundAudioPlayer = useRef<HTMLAudioElement>(null);
  const currentGameAudio = useRef<HTMLAudioElement | null>(null);
  const audioAnalyzer = useRef<AnalyserNode | null>(null);
  const visualizationLoop = useRef<number | undefined>(undefined);

  const availableSongs = [
    { title: "Shape of You", file: "shape-of-you.mp3" },
    { title: "Believer", file: "believer.mp3" },
    { title: "Blank Space", file: "blank-space.mp3" },
    { title: "Counting Stars", file: "counting-stars.mp3" },
    { title: "Party For You", file: "party4u.mp3" },
    { title: "Roar", file: "roar.mp3" },
  ];

  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const currentSong = availableSongs[currentSongIndex]!;
  const currentSongTitle = currentSong.title;
  const colorNamesList = ["red", "orange", "yellow", "green", "blue", "purple"];

  const rememberPlayerChoices = useCallback(
    (songName: string, votes: number[]) => {
      const existingChoices: Record<string, number[]> = JSON.parse(
        localStorage.getItem("colorChordsStats") ?? "{}",
      );
      existingChoices[songName] = votes;
      localStorage.setItem("colorChordsStats", JSON.stringify(existingChoices));
      setAllPlayerStats(existingChoices);

      console.log(
        `${songName}: ${votes
          .map((count, idx) => `${count}x ${colorNamesList[idx]}`)
          .filter((vote) => !vote.startsWith("0"))
          .join(", ")}`,
      );
    },
    [colorNamesList],
  );

  const loadPreviousChoices = useCallback(() => {
    const savedChoices: Record<string, number[]> = JSON.parse(
      localStorage.getItem("colorChordsStats") ?? "{}",
    );
    setAllPlayerStats(savedChoices);

    if (savedChoices[currentSongTitle]) {
      setPlayerVoteHistory(savedChoices[currentSongTitle]);
    }
  }, [currentSongTitle]);

  useEffect(() => {
    loadPreviousChoices();
  }, [loadPreviousChoices]);

  const startFreshRound = useCallback(() => {
    const noteOptions = Object.values(musicalNotes);
    const randomNoteChoice = Math.floor(Math.random() * noteOptions.length);

    if (currentGameAudio.current) {
      currentGameAudio.current.currentTime = 0;
      currentGameAudio.current.play().catch((e) => {
        console.log("Audio restart failed:", e);
      });
    }

    const colorIndices: number[] = [];
    for (let i = 0; i < 6; i++) {
      colorIndices.push(i);
    }
    colorIndices.sort(() => Math.random() - 0.5);

    setRightAnswerIndex(randomNoteChoice);
    setIsMusicPlaying(true);

    setTimeout(() => {
      setAvailableColors(colorIndices);
      setIsMusicPlaying(false);
    }, 1000);
  }, []);

  const updateMusicVisualization = useCallback(() => {
    if (!audioAnalyzer.current) return;

    const dataPoints = audioAnalyzer.current.frequencyBinCount;
    const rawMusicData = new Uint8Array(dataPoints);
    audioAnalyzer.current.getByteFrequencyData(rawMusicData);

    const smoothData = Array.from(rawMusicData).map((value) => value / 255);
    setMusicVisualization(smoothData.slice(0, 8));

    visualizationLoop.current = requestAnimationFrame(updateMusicVisualization);
  }, []);

  const loadSong = useCallback(
    async (songFile: string) => {
      console.log("Loading song:", songFile);

      if (currentGameAudio.current) {
        currentGameAudio.current.pause();
        currentGameAudio.current = null;
      }

      const gameMusic = new Audio(`/mp3/${songFile}`);
      gameMusic.volume = 1.0;
      gameMusic.loop = true;
      currentGameAudio.current = gameMusic;

      try {
        audioSystem ??= new AudioContext();
        const musicSource = audioSystem.createMediaElementSource(gameMusic);
        const visualizer = audioSystem.createAnalyser();
        visualizer.fftSize = 64;
        musicSource.connect(visualizer);
        visualizer.connect(audioSystem.destination);
        audioAnalyzer.current = visualizer;
        console.log("Audio analyzer setup complete");
      } catch (error) {
        console.log("Audio analyzer setup failed:", error);
      }

      gameMusic
        .play()
        .then(() => {
          console.log("Audio play successful");
          updateMusicVisualization();
        })
        .catch((e) => {
          console.log("Audio play failed:", e);
        });

      setHasGameStarted(true);
      startFreshRound();
    },
    [startFreshRound, updateMusicVisualization],
  );

  const kickOffTheGame = useCallback(async () => {
    console.log("startGame clicked");
    loadSong(currentSong.file);
  }, [currentSong.file, loadSong]);

  useEffect(() => {
    return () => {
      if (visualizationLoop.current) {
        cancelAnimationFrame(visualizationLoop.current);
      }
    };
  }, []);

  const goToNextSong = useCallback(() => {
    const nextIndex = (currentSongIndex + 1) % availableSongs.length;
    const nextSong = availableSongs[nextIndex]!;

    setCurrentSongIndex(nextIndex);
    setShouldShowResults(false);
    setPlayerChoice(null);
    setAvailableColors([]);

    loadSong(nextSong.file);
  }, [currentSongIndex, availableSongs, loadSong]);

  const handleColorChoice = useCallback(
    (chosenColorIndex: number) => {
      setPlayerChoice(chosenColorIndex);

      if (currentGameAudio.current) {
        currentGameAudio.current.pause();
      }

      const updatedVotes = [...playerVoteHistory];
      updatedVotes[chosenColorIndex] =
        (updatedVotes[chosenColorIndex] ?? 0) + 1;
      setPlayerVoteHistory(updatedVotes);

      rememberPlayerChoices(currentSongTitle, updatedVotes);

      setShouldShowResults(true);

      if (chosenColorIndex === rightAnswerIndex) {
        setTimeout(() => {
          setShouldShowResults(false);
          startFreshRound();
        }, 2000);
      }
    },
    [
      rightAnswerIndex,
      startFreshRound,
      playerVoteHistory,
      rememberPlayerChoices,
      currentSongTitle,
    ],
  );

  if (!hasGameStarted) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#0f172a" }}
      >
        <audio
          ref={mainAudioPlayer}
          loop
          preload="auto"
          onError={(e) => console.log("Audio error:", e)}
          onLoadStart={() => console.log("Audio loading started")}
          onCanPlay={() => console.log("Audio can play")}
          onPlay={() => console.log("Audio is playing")}
          onPause={() => console.log("Audio paused")}
        >
          <source src={`/mp3/${currentSong.file}`} type="audio/mpeg" />
        </audio>

        <audio
          ref={backgroundAudioPlayer}
          loop
          preload="auto"
          onError={(e) => console.log("Background music error:", e)}
          onLoadStart={() => console.log("Background music loading started")}
          onCanPlay={() => console.log("Background music can play")}
          onPlay={() => console.log("Background music is playing")}
          onPause={() => console.log("Background music paused")}
        >
          <source src={`/mp3/${currentSong.file}`} type="audio/mpeg" />
        </audio>

        <button
          onClick={kickOffTheGame}
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
      {/* Show a pulsing color when music is playing */}
      {isMusicPlaying && (
        <div
          className="h-32 w-32 animate-ping rounded-full"
          style={{ backgroundColor: gameColors[rightAnswerIndex] }}
        />
      )}

      {!isMusicPlaying && availableColors.length === 0 && (
        <button
          onClick={startFreshRound}
          className="group relative h-24 w-24 rounded-full bg-gradient-to-r from-white to-gray-200 shadow-xl transition-all duration-300 hover:scale-110"
        >
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            <div className="ml-1 h-0 w-0 border-t-[8px] border-b-[8px] border-l-[12px] border-t-transparent border-b-transparent border-l-white"></div>
          </div>
        </button>
      )}

      {!isMusicPlaying && availableColors.length > 0 && !shouldShowResults && (
        <div className="text-center">
          <h2 className="mb-8 text-2xl font-bold text-white">
            {currentSongTitle}
          </h2>
          <div className="mb-12 flex items-end justify-center space-x-2">
            {musicVisualization.map((value, index) => (
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
            {availableColors.map((colorIdx, position) => {
              const wasChosen = playerChoice === colorIdx;
              return (
                <div key={position} className="relative">
                  <button
                    onClick={() => handleColorChoice(colorIdx)}
                    className={`h-24 w-24 rounded-full transition-all hover:scale-110 ${
                      wasChosen
                        ? "ring-opacity-90 scale-105 ring-8 ring-white"
                        : ""
                    }`}
                    style={{ backgroundColor: gameColors[colorIdx] }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shouldShowResults && playerChoice !== null && (
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="flex items-center justify-center space-x-8">
            <div
              className="h-24 w-24 rounded-full shadow-lg transition-all duration-500"
              style={{ backgroundColor: gameColors[playerChoice] }}
            />
            <div className="flex flex-col space-y-3">
              {gameColors.map((color, index) => {
                const votesForThisSong = allPlayerStats[currentSongTitle] ?? [
                  0, 0, 0, 0, 0, 0,
                ];
                const voteCount = votesForThisSong[index] ?? 0;
                const highestVoteCount = Math.max(...votesForThisSong, 1);
                const barLength = (voteCount / highestVoteCount) * 200;
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
                          width: `${barLength}px`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={goToNextSong}
            className="group relative h-16 w-16 rounded-full bg-gradient-to-r from-green-400 to-green-600 shadow-xl transition-all duration-300 hover:scale-110 hover:from-green-500 hover:to-green-700"
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full">
              <div className="ml-1 h-0 w-0 border-t-[12px] border-b-[12px] border-l-[18px] border-t-transparent border-b-transparent border-l-white"></div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
