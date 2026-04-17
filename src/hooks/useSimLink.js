/**
 * useSimLink.js
 * -------------
 * React hook that bridges a YouTube IFrame Player instance to the Dexaview
 * simulation engine.
 *
 * What it does:
 *   • Maintains a list of "cue points" – { time (seconds), eventName, origin }.
 *   • Polls the YouTube player's current time via requestAnimationFrame (polling
 *     is necessary because the IFrame API does not expose a reliable time-change
 *     event).
 *   • When the player's current time crosses a cue point, it fires the
 *     corresponding engine event exactly once.
 *   • Exposes controls so the simulation can also seek the video (bi-directional).
 *
 * Usage:
 *   const { addCue, seekVideo, playerRef } = useSimLink(engineRef, {
 *     videoId: "dQw4w9WgXcQ",
 *     onCueTriggered: (cue) => console.log("Triggered", cue),
 *   });
 *
 *   // Register the blowout event at 1 min 30 sec
 *   addCue({ time: 90, eventName: "blowout", origin: new THREE.Vector3(0,0,0) });
 */

import { useCallback, useEffect, useRef } from "react";

// Tolerance in seconds – cues fire when the player time is within this window
const CUE_TOLERANCE = 0.1;

export function useSimLink(engineRef, options = {}) {
  const { videoId, onCueTriggered } = options;

  // Ref to the YouTube IFrame Player object (populated after the API loads)
  const playerRef = useRef(null);

  // List of registered cue points. Each cue gets a `fired` flag reset on seek.
  const cuesRef = useRef([]);

  // rAF handle for the polling loop
  const rafRef = useRef(null);

  // -------------------------------------------------------------------------
  // YouTube IFrame API bootstrap
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!videoId) return;

    /**
     * Injects the YouTube IFrame API script tag once.
     * If it is already present (e.g. component remounted) the load callback
     * fires again via onYouTubeIframeAPIReady.
     */
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("dexaview-yt-player", {
        videoId,
        playerVars: {
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: _handlePlayerStateChange,
        },
      });
    };

    // If YT is already loaded (hot-reload scenario), create the player immediately
    if (window.YT?.Player) {
      window.onYouTubeIframeAPIReady();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // -------------------------------------------------------------------------
  // Polling loop
  // -------------------------------------------------------------------------

  /**
   * Starts the polling loop when the video begins playing.
   * The loop reads getCurrentTime() from the YT player and checks each cue.
   */
  const _startPolling = useCallback(() => {
    const poll = () => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") {
        rafRef.current = requestAnimationFrame(poll);
        return;
      }

      const currentTime = player.getCurrentTime();

      cuesRef.current.forEach((cue) => {
        if (cue.fired) return;
        if (Math.abs(currentTime - cue.time) <= CUE_TOLERANCE) {
          cue.fired = true;

          // Fire the physics event on the engine
          if (engineRef?.current) {
            engineRef.current.triggerPhysicsEvent(cue.eventName, cue.origin);
          }

          onCueTriggered?.(cue);
        }
      });

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
  }, [engineRef, onCueTriggered]);

  /** Stops the polling loop and resets all cue `fired` flags on seek. */
  const _stopPolling = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * Handles YouTube player state changes.
   * 1 = playing → start polling
   * 2 = paused  → stop polling
   * 0 = ended   → stop polling
   * YT.PlayerState.BUFFERING (3) is ignored intentionally.
   */
  const _handlePlayerStateChange = useCallback(
    ({ data }) => {
      if (data === 1) {
        _startPolling();
      } else if (data === 0 || data === 2) {
        _stopPolling();
        // Reset fired flags so cues can replay after a seek
        if (data === 2) {
          cuesRef.current.forEach((c) => (c.fired = false));
        }
      }
    },
    [_startPolling, _stopPolling]
  );

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Registers a new cue point. Safe to call before the player is ready.
   * @param {{ time: number, eventName: string, origin?: THREE.Vector3 }} cue
   */
  const addCue = useCallback((cue) => {
    cuesRef.current.push({ fired: false, ...cue });
  }, []);

  /**
   * Removes all cue points. Useful when loading a different video.
   */
  const clearCues = useCallback(() => {
    cuesRef.current = [];
  }, []);

  /**
   * Seeks the YouTube video to a given timestamp (seconds).
   * Use this from the simulation side to achieve reverse synchronisation –
   * e.g. clicking a 3D object seeks the video to the relevant tutorial moment.
   * @param {number} seconds
   */
  const seekVideo = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  return { playerRef, addCue, clearCues, seekVideo };
}
