
import React, { useEffect, useRef, useState } from "react";
import "./SummaryAudio.css";

export default function SummaryAudio({ text }) {
  const [status, setStatus] = useState("idle");
  const [speed, setSpeed] = useState("1");
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState([]);

  const utteranceRef = useRef(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, [text]);

  const stop = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  };

  const play = () => {
    const summary = textRef.current?.trim();

    if (!summary) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported by this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.rate = Number(speed);

    const selectedVoice = voices.find(
      (voice) => voice.name === voiceName
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setStatus("playing");
    utterance.onpause = () => setStatus("paused");
    utterance.onresume = () => setStatus("playing");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = (event) => {
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setStatus("idle");
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  };

  const resume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("playing");
    } else if (status === "idle") {
      play();
    }
  };

  const changeSpeed = (value) => {
    const wasPlaying = status === "playing";
    const wasPaused = status === "paused";

    setSpeed(value);

    if (wasPlaying || wasPaused) {
      const currentSummary = textRef.current;
      window.speechSynthesis.cancel();
      utteranceRef.current = null;

      // Restart the summary at the new speed.
      const utterance = new SpeechSynthesisUtterance(
        currentSummary
      );
      utterance.rate = Number(value);

      const selectedVoice = voices.find(
        (voice) => voice.name === voiceName
      );

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        if (wasPaused) {
          window.speechSynthesis.pause();
          setStatus("paused");
        } else {
          setStatus("playing");
        }
      };

      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => setStatus("idle");

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!text?.trim()) {
    return null;
  }

  return (
    <section className="summary-audio">
      <div className="summary-audio-heading">
        <div className="summary-audio-icon">♫</div>
        <div>
          <h3>Listen to Summary</h3>
          <p>Listen to your AI-generated summary</p>
        </div>
        <span className={`audio-status ${status}`}>
          {status === "playing"
            ? "Playing"
            : status === "paused"
            ? "Paused"
            : "Ready"}
        </span>
      </div>

      <div className="audio-controls">
        <button
          type="button"
          className="audio-button audio-play"
          onClick={play}
          disabled={status === "playing"}
        >
          ▶ Play
        </button>

        <button
          type="button"
          className="audio-button"
          onClick={pause}
          disabled={status !== "playing"}
        >
          ⏸ Pause
        </button>

        <button
          type="button"
          className="audio-button"
          onClick={resume}
          disabled={status !== "paused" && status !== "idle"}
        >
          ▶ Resume
        </button>

        <button
          type="button"
          className="audio-button audio-stop"
          onClick={stop}
        >
          ■ Stop
        </button>
      </div>

      <div className="audio-settings">
        <label htmlFor="summary-speed">Reading speed</label>
        <select
          id="summary-speed"
          value={speed}
          onChange={(event) => changeSpeed(event.target.value)}
        >
          <option value="0.75">0.75× Slow</option>
          <option value="1">1× Normal</option>
          <option value="1.25">1.25×</option>
          <option value="1.5">1.5× Fast</option>
          <option value="2">2× Very fast</option>
        </select>

        <label htmlFor="summary-voice">Voice</label>
        <select
          id="summary-voice"
          value={voiceName}
          onChange={(event) => setVoiceName(event.target.value)}
        >
          <option value="">Default voice</option>
          {voices.map((voice) => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      <p className="audio-note">
        Changing speed during playback restarts the summary.
        Available voices depend on your browser and operating system.
      </p>
    </section>
  );
}
