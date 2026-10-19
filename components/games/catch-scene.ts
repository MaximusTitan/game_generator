import type PhaserNS from "phaser";
import type { CatchSpec } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import { HEIGHT, WIDTH, type SceneFactory } from "./phaser-host";

type Item = { obj: PhaserNS.GameObjects.Text; vy: number; kind: "good" | "bad" | "bonus" };

const DIFFICULTY_MULT = { easy: 0.8, medium: 1, hard: 1.25 };

export const catchScene: SceneFactory<CatchSpec> = (Phaser, { spec, onHud, sfx, controls }) => {
  const palette = PALETTES[spec.theme];
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

  return class CatchScene extends Phaser.Scene {
    hero!: PhaserNS.GameObjects.Text;
    keys!: PhaserNS.Types.Input.Keyboard.CursorKeys;
    items: Item[] = [];
    score = 0;
    lives = spec.lives;
    level = 1;
    timeLeft = spec.timerSeconds;
    spawnIn = 0;
    hurtUntil = 0;
    pointerX: number | null = null;
    over = false;
    betweenLevels = false;

    constructor() {
      super("main");
    }

    create() {
      this.cameras.main.setBackgroundColor(palette.sky);
      for (let i = 0; i < 18; i++) {
        this.add
          .text(Math.random() * WIDTH, Math.random() * (HEIGHT - 80), pick(palette.decor), { fontSize: `${14 + Math.random() * 16}px` })
          .setAlpha(0.35);
      }
      this.add.rectangle(WIDTH / 2, HEIGHT - 12, WIDTH, 24, Phaser.Display.Color.HexStringToColor(palette.ground).color);

      this.hero = this.add.text(WIDTH / 2, HEIGHT - 60, spec.hero, { fontSize: "56px" }).setOrigin(0.5);
      this.keys = this.input.keyboard!.createCursorKeys();
      this.input.on("pointermove", (p: PhaserNS.Input.Pointer) => {
        if (p.isDown || p.wasTouch) this.pointerX = p.x;
      });
      this.input.on("pointerdown", (p: PhaserNS.Input.Pointer) => (this.pointerX = p.x));
      this.input.on("pointerup", () => (this.pointerX = null));

      if (spec.timerSeconds > 0) {
        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (this.over || this.betweenLevels) return;
            this.timeLeft -= 1;
            onHud({ timeLeft: this.timeLeft });
            if (this.timeLeft <= 0) this.finish("lost", "Time's up!");
          },
        });
      }
      onHud({ score: 0, lives: this.lives, level: 1, timeLeft: spec.timerSeconds || null, status: "playing" });
    }

    target() {
      return spec.targetScore * this.level;
    }

    speedMult() {
      return DIFFICULTY_MULT[spec.difficulty] * (1 + (this.level - 1) * 0.18);
    }

    spawn() {
      const roll = Math.random();
      const kind: Item["kind"] = spec.bonus && roll < 0.06 ? "bonus" : roll < 0.72 ? "good" : "bad";
      const emoji = kind === "bonus" ? "🌟" : kind === "good" ? pick(spec.goodItems) : pick(spec.badItems);
      const obj = this.add.text(30 + Math.random() * (WIDTH - 60), -30, emoji, { fontSize: "40px" }).setOrigin(0.5);
      const vy = (90 + spec.fallSpeed * 22) * this.speedMult() * (0.8 + Math.random() * 0.4);
      this.items.push({ obj, vy, kind });
    }

    update(time: number, delta: number) {
      if (this.over || this.betweenLevels) return;
      const dt = delta / 1000;

      // Movement: keyboard, on-screen buttons, or pointer follow.
      const speed = 460;
      let dx = 0;
      if (this.keys.left.isDown || controls.current?.left) dx -= 1;
      if (this.keys.right.isDown || controls.current?.right) dx += 1;
      if (dx !== 0) this.hero.x += dx * speed * dt;
      else if (this.pointerX !== null) {
        const diff = this.pointerX - this.hero.x;
        this.hero.x += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      }
      this.hero.x = Phaser.Math.Clamp(this.hero.x, 30, WIDTH - 30);
      this.hero.setAlpha(time < this.hurtUntil ? (Math.floor(time / 100) % 2 ? 0.3 : 1) : 1);

      this.spawnIn -= delta;
      if (this.spawnIn <= 0) {
        this.spawn();
        this.spawnIn = (1300 - spec.spawnRate * 90) / this.speedMult();
      }

      for (const item of [...this.items]) {
        item.obj.y += item.vy * dt;
        const hit = Math.abs(item.obj.x - this.hero.x) < 42 && Math.abs(item.obj.y - this.hero.y) < 40;
        if (hit) {
          this.remove(item);
          this.collect(item, time);
          if (this.over) return;
        } else if (item.obj.y > HEIGHT + 30) {
          this.remove(item);
        }
      }
    }

    remove(item: Item) {
      item.obj.destroy();
      this.items.splice(this.items.indexOf(item), 1);
    }

    floatText(x: number, y: number, text: string, color: string) {
      const t = this.add.text(x, y, text, { fontSize: "24px", color, fontStyle: "bold" }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    }

    collect(item: Item, time: number) {
      if (item.kind === "bad") {
        if (time < this.hurtUntil) return;
        sfx("bad");
        this.cameras.main.shake(150, 0.01);
        this.hurtUntil = time + 1000;
        if (spec.lives > 0) {
          this.lives -= 1;
          onHud({ lives: this.lives });
          if (this.lives <= 0) return this.finish("lost", "Out of lives!");
        } else {
          this.score = Math.max(0, this.score - 10);
          this.floatText(this.hero.x, this.hero.y - 40, "-10", "#ef4444");
          onHud({ score: this.score });
        }
        return;
      }

      const points = item.kind === "bonus" ? 50 : 10;
      this.score += points;
      sfx("good");
      this.floatText(item.obj.x, item.obj.y, `+${points}`, palette.accent);
      onHud({ score: this.score });

      if (this.score >= this.target()) {
        if (this.level >= spec.levels) return this.finish("won", "You caught them all!");
        this.level += 1;
        this.timeLeft = spec.timerSeconds;
        this.items.forEach((i) => i.obj.destroy());
        this.items = [];
        sfx("level");
        onHud({ level: this.level, timeLeft: spec.timerSeconds || null, status: "levelup", message: `Level ${this.level}!` });
        this.betweenLevels = true;
        this.time.delayedCall(1200, () => {
          this.betweenLevels = false;
          onHud({ status: "playing", message: undefined });
        });
      }
    }

    finish(status: "won" | "lost", message: string) {
      this.over = true;
      sfx(status === "won" ? "win" : "lose");
      onHud({ status, message, score: this.score });
    }
  };
};
