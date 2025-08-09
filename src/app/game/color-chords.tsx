"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

const musicalNotes = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
};

const gameColors = [
  "#FF6B6B", // red
  "#FFB347", // orange
  "#FFFF66", // yellow
  "#90EE90", // green
  "#40E0D0", // blue
  "#DA70D6", // purple
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

  const availableSongs = useMemo(
    () => [
      { title: "Shape of You", file: "shape-of-you.mp3" },
      { title: "Believer", file: "believer.mp3" },
      { title: "Blank Space", file: "blank-space.mp3" },
      { title: "Counting Stars", file: "counting-stars.mp3" },
      { title: "Party For You", file: "party4u.mp3" },
      { title: "Roar", file: "roar.mp3" },
      { title: "Let It Go", file: "let-it-go.mp3" },
      { title: "Fein", file: "fein.mp3" },
      { title: "Wake Me Up", file: "wake-me-up.mp3" },
      { title: "Ordinary", file: "ordinary.mp3" },
      { title: "Golden", file: "golden.mp3" },
      { title: "Run", file: "run.mp3" },
      { title: "As It Was", file: "as-it-was.mp3" },
    ],
    [],
  );

  const shuffleArray = useCallback((array: typeof availableSongs) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }, []);

  const [shuffledSongs, setShuffledSongs] = useState(() =>
    shuffleArray(availableSongs),
  );
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const currentSong = shuffledSongs[currentSongIndex]!;
  const currentSongTitle = currentSong.title;
  const colorNamesList = useMemo(
    () => ["red", "orange", "yellow", "green", "blue", "purple"],
    [],
  );

  const rememberPlayerChoices = useCallback(
    (songName: string, votes: number[]) => {
      const existingChoices: Record<string, number[]> = JSON.parse(
        localStorage.getItem("colorChordsStats") ?? "{}",
      ) as Record<string, number[]>;
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
    ) as Record<string, number[]>;
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
    try {
      await loadSong(currentSong.file);
    } catch (error) {
      console.error("Failed to load song:", error);
    }
  }, [currentSong.file, loadSong]);

  useEffect(() => {
    return () => {
      if (visualizationLoop.current) {
        cancelAnimationFrame(visualizationLoop.current);
      }
    };
  }, []);

  const goToNextSong = useCallback(async () => {
    const nextIndex = currentSongIndex + 1;

    if (nextIndex >= shuffledSongs.length) {
      const newShuffledSongs = shuffleArray(availableSongs);
      setShuffledSongs(newShuffledSongs);
      setCurrentSongIndex(0);
      setShouldShowResults(false);
      setPlayerChoice(null);
      setAvailableColors([]);
      try {
        await loadSong(newShuffledSongs[0]!.file);
      } catch (error) {
        console.error("Failed to load song:", error);
      }
    } else {
      const nextSong = shuffledSongs[nextIndex]!;
      setCurrentSongIndex(nextIndex);
      setShouldShowResults(false);
      setPlayerChoice(null);
      setAvailableColors([]);
      try {
        await loadSong(nextSong.file);
      } catch (error) {
        console.error("Failed to load song:", error);
      }
    }
  }, [currentSongIndex, shuffledSongs, shuffleArray, availableSongs, loadSong]);

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
        className="relative flex min-h-screen items-end justify-center pb-20"
        style={{
          backgroundImage: "url('/bg4.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
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

        <div className="group relative">
          <div className="absolute -inset-8 animate-pulse rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"></div>
          <button
            onClick={kickOffTheGame}
            className="relative h-72 w-72 rounded-full bg-gradient-to-r from-white to-gray-100 shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_80px_rgba(139,69,19,0.3)]"
          >
            <div className="absolute inset-8 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 shadow-2xl">
              <div className="ml-4 h-0 w-0 border-t-[28px] border-b-[28px] border-l-[42px] border-t-transparent border-b-transparent border-l-white drop-shadow-lg"></div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-end justify-center pb-20"
      style={{
        backgroundImage: "url('/bg4.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {isMusicPlaying && (
        <div className="relative">
          <div
            className="h-40 w-40 animate-ping rounded-full shadow-2xl"
            style={{
              backgroundColor: gameColors[rightAnswerIndex],
              boxShadow: `0 0 60px ${gameColors[rightAnswerIndex]}, 0 0 120px ${gameColors[rightAnswerIndex]}40`,
            }}
          />
          <div
            className="absolute inset-4 animate-pulse rounded-full"
            style={{
              backgroundColor: gameColors[rightAnswerIndex],
              filter: "blur(2px)",
            }}
          />
        </div>
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
          <h2 className="mb-8 animate-pulse bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-4xl font-bold text-transparent text-white drop-shadow-2xl">
            {currentSongTitle}
          </h2>
          <div className="mb-12 flex items-end justify-center space-x-3 rounded-2xl border border-white/10 bg-white/20 p-6 backdrop-blur-sm">
            {musicVisualization.map((value, index) => (
              <div
                key={index}
                className="w-6 rounded-t-lg bg-cyan-400 shadow-lg shadow-cyan-400/50 transition-all duration-75 ease-out"
                style={{
                  height: `${Math.max(8, value * 120)}px`,
                  filter: `drop-shadow(0 0 ${value * 20}px rgb(34, 211, 238)) brightness(0.8)`,
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-10">
            {availableColors.map((colorIdx, position) => {
              const wasChosen = playerChoice === colorIdx;
              return (
                <div key={position} className="group relative">
                  <div className="absolute -inset-2 rounded-full bg-white opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-75"></div>
                  <button
                    onClick={() => handleColorChoice(colorIdx)}
                    className={`relative h-28 w-28 rounded-full transition-all duration-300 hover:scale-125 hover:shadow-2xl ${
                      wasChosen
                        ? "ring-opacity-90 scale-110 shadow-2xl ring-8 ring-white"
                        : "hover:shadow-lg"
                    }`}
                    style={{
                      backgroundColor: gameColors[colorIdx],
                      boxShadow: wasChosen
                        ? `0 0 40px ${gameColors[colorIdx]}`
                        : `0 0 20px ${gameColors[colorIdx]}80`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shouldShowResults && playerChoice !== null && (
        <div className="flex flex-col items-center justify-center space-y-10 rounded-3xl border border-white/20 bg-black/30 p-8 backdrop-blur-lg">
          <div className="flex items-center justify-center space-x-12">
            <div className="group relative">
              <div className="absolute -inset-3 rounded-full bg-white opacity-50 blur-lg transition-opacity group-hover:opacity-75"></div>
              <div
                className="relative h-32 w-32 animate-pulse rounded-full shadow-2xl transition-all duration-500"
                style={{
                  backgroundColor: gameColors[playerChoice],
                  boxShadow: `0 0 50px ${gameColors[playerChoice]}`,
                }}
              />
            </div>
            <div className="flex flex-col space-y-4">
              {gameColors.map((color, index) => {
                const votesForThisSong = allPlayerStats[currentSongTitle] ?? [
                  0, 0, 0, 0, 0, 0,
                ];
                const voteCount = votesForThisSong[index] ?? 0;
                const highestVoteCount = Math.max(...votesForThisSong, 1);
                const barLength = (voteCount / highestVoteCount) * 240;
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white/30 shadow-lg"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 15px ${color}60`,
                      }}
                    />
                    <div className="h-6 w-60 overflow-hidden rounded-full border border-white/10 bg-gray-800/60">
                      <div
                        className="h-full rounded-full shadow-inner transition-all duration-1000 ease-out"
                        style={{
                          backgroundColor: color,
                          width: `${barLength}px`,
                          boxShadow: `inset 0 0 10px ${color}80`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 opacity-30 blur-lg transition-opacity duration-300 group-hover:opacity-60"></div>
            <button
              onClick={async () => {
                try {
                  await goToNextSong();
                } catch (error) {
                  console.error("Failed to go to next song:", error);
                }
              }}
              className="relative h-20 w-20 rounded-full bg-gradient-to-r from-green-400 to-green-600 shadow-2xl transition-all duration-300 hover:scale-110 hover:from-green-500 hover:to-green-700 hover:shadow-[0_0_40px_rgba(34,197,94,0.5)]"
            >
              <div className="absolute inset-2 flex items-center justify-center rounded-full">
                <svg
                  className="h-8 w-8 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
