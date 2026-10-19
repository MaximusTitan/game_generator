"use client";

import { useEffect, useRef } from "react";
import type PhaserNS from "phaser";
import type { EngineProps } from "./types";

export const WIDTH = 800;
export const HEIGHT = 500;

export type SceneDeps<S> = {
  spec: S;
  onHud: EngineProps["onHud"];
  sfx: EngineProps["sfx"];
  controls: EngineProps["controls"];
};

export type SceneFactory<S> = (Phaser: typeof PhaserNS, deps: SceneDeps<S>) => typeof PhaserNS.Scene;

/**
 * Boots a Phaser game into a div. Phaser is imported on the client only,
 * and the game is torn down on unmount (restart = remount).
 */
export function PhaserHost<S>({
  factory,
  spec,
  paused,
  onHud,
  sfx,
  controls,
}: Omit<EngineProps, "spec"> & { spec: S; factory: SceneFactory<S> }) {
  const el = useRef<HTMLDivElement>(null);
  const game = useRef<PhaserNS.Game | null>(null);
  // Scenes call through refs so they always see the latest callbacks.
  const hudRef = useRef(onHud);
  const sfxRef = useRef(sfx);
  useEffect(() => {
    hudRef.current = onHud;
    sfxRef.current = sfx;
  });

  useEffect(() => {
    let cancelled = false;
    import("phaser").then((mod) => {
      const Phaser = (mod.default ?? mod) as typeof PhaserNS;
      if (cancelled || !el.current) return;
      const Scene = factory(Phaser, {
        spec,
        onHud: (h) => hudRef.current(h),
        sfx: (n) => sfxRef.current(n),
        controls,
      });
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el.current,
        width: WIDTH,
        height: HEIGHT,
        transparent: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [Scene],
        banner: false,
        audio: { noAudio: true },
      });
    });
    return () => {
      cancelled = true;
      game.current?.destroy(true);
      game.current = null;
    };
    // spec changes remount the whole engine via a key in GamePlayer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = game.current?.scene.getScenes(false)[0];
    if (!scene) return;
    if (paused) scene.scene.pause();
    else scene.scene.resume();
  }, [paused]);

  return <div ref={el} className="h-full w-full [&_canvas]:!touch-none" />;
}
