import type PhaserNS from "phaser";
import type { RaceSpec } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import { HEIGHT, WIDTH, type SceneFactory } from "./phaser-host";

type Thing = { obj: PhaserNS.GameObjects.Text; lane: number; d: number; kind: "obstacle" | "pickup" | "bonus" };
type Gate = {
  d: number;
  question: string;
  answer: string;
  correctLane: number;
  labels: { obj: PhaserNS.GameObjects.Text; lane: number }[];
  announced: boolean;
};
type Rival = { obj: PhaserNS.GameObjects.Text; label: PhaserNS.GameObjects.Text; lane: number; x: number; d: number; pace: number; nextTurn: number };

const DIFFICULTY_MULT = { easy: 0.8, medium: 1, hard: 1.2 };
const PLACE_POINTS = [300, 200, 120, 80, 50, 30];
const LABEL_TOP = 92; // answer labels wait here (under the question) until the gate scrolls in
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export const raceScene: SceneFactory<RaceSpec> = (Phaser, { spec, onHud, sfx, controls }) => {
  const palette = PALETTES[spec.theme];
  const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

  const roadW = Math.min(WIDTH * 0.62, spec.lanes * 115);
  const roadX = (WIDTH - roadW) / 2;
  const laneW = roadW / spec.lanes;
  const laneX = (lane: number) => roadX + laneW * (lane + 0.5);
  const PLAYER_Y = HEIGHT - 85;

  return class RaceScene extends Phaser.Scene {
    hero!: PhaserNS.GameObjects.Text;
    keys!: PhaserNS.Types.Input.Keyboard.CursorKeys;
    dashes: PhaserNS.GameObjects.Rectangle[] = [];
    decor: PhaserNS.GameObjects.Text[] = [];
    finishLine!: PhaserNS.GameObjects.Text;
    things: Thing[] = [];
    rivals: Rival[] = [];
    gates: Gate[] = [];
    questionText!: PhaserNS.GameObjects.Text;
    lane = Math.floor(spec.lanes / 2);
    dist = 0;
    nextSpawnAt = 400;
    score = 0;
    lives = spec.lives;
    level = 1;
    timeLeft = spec.timerSeconds;
    boostUntil = 0;
    slowUntil = 0;
    hurtUntil = 0;
    held = { left: false, right: false };
    over = false;
    betweenLevels = false;

    constructor() {
      super("main");
    }

    baseSpeed() {
      return (170 + spec.speed * 24) * DIFFICULTY_MULT[spec.difficulty] * (1 + (this.level - 1) * 0.12);
    }

    finishDist() {
      return spec.trackLength * (170 + spec.speed * 24);
    }

    create() {
      this.cameras.main.setBackgroundColor(palette.ground);
      this.add.rectangle(WIDTH / 2, HEIGHT / 2, roadW, HEIGHT, color(palette.track));
      this.add.rectangle(roadX - 4, HEIGHT / 2, 8, HEIGHT, 0xffffff, 0.85);
      this.add.rectangle(roadX + roadW + 4, HEIGHT / 2, 8, HEIGHT, 0xffffff, 0.85);
      for (let l = 1; l < spec.lanes; l++) {
        for (let k = 0; k < 8; k++) {
          this.dashes.push(this.add.rectangle(roadX + laneW * l, k * 80, 6, 38, 0xffffff, 0.6));
        }
      }
      for (let i = 0; i < 10; i++) {
        const left = i % 2 === 0;
        const x = left ? Math.random() * (roadX - 30) + 15 : roadX + roadW + 15 + Math.random() * (roadX - 30);
        this.decor.push(this.add.text(x, Math.random() * HEIGHT, pick(palette.decor), { fontSize: "26px" }).setOrigin(0.5).setAlpha(0.8));
      }
      this.finishLine = this.add
        .text(WIDTH / 2, -100, "🏁".repeat(Math.ceil(roadW / 34)), { fontSize: "30px" })
        .setOrigin(0.5)
        .setVisible(false);

      this.questionText = this.add
        .text(WIDTH / 2, 12, "", {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#1f2937",
          backgroundColor: "#ffffffee",
          padding: { x: 12, y: 6 },
          align: "center",
          wordWrap: { width: WIDTH - 60 },
        })
        .setOrigin(0.5, 0)
        .setDepth(10)
        .setVisible(false);

      this.hero = this.add.text(laneX(this.lane), PLAYER_Y, spec.hero, { fontSize: "52px" }).setOrigin(0.5).setDepth(5);
      this.keys = this.input.keyboard!.createCursorKeys();
      this.input.on("pointerdown", (p: PhaserNS.Input.Pointer) => this.steer(p.x < this.hero.x ? -1 : 1));

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
      this.startLevel();
    }

    startLevel() {
      this.dist = 0;
      this.nextSpawnAt = 400;
      this.timeLeft = spec.timerSeconds;
      this.things.forEach((t) => t.obj.destroy());
      this.things = [];
      this.rivals.forEach((r) => (r.obj.destroy(), r.label.destroy()));
      this.rivals = spec.opponents.map((o, i) => {
        const lane = (this.lane + i + 1) % spec.lanes;
        const obj = this.add.text(laneX(lane), 0, o.emoji, { fontSize: "46px" }).setOrigin(0.5).setDepth(4);
        const label = this.add
          .text(0, 0, o.name, { fontSize: "13px", color: "#fff", backgroundColor: "#0008", padding: { x: 4, y: 1 } })
          .setOrigin(0.5)
          .setDepth(4);
        return { obj, label, lane, x: laneX(lane), d: 60 + i * 70, pace: 0.86 + Math.random() * 0.2, nextTurn: 1500 + Math.random() * 2000 };
      });
      this.finishLine.setVisible(false);
      this.setupGates();
      onHud({
        score: this.score,
        lives: this.lives,
        level: this.level,
        timeLeft: spec.timerSeconds || null,
        status: "playing",
        message: undefined,
      });
    }

    /** Spread this level's questions evenly along the track as answer gates. */
    setupGates() {
      this.gates.forEach((g) => g.labels.forEach((l) => l.obj.destroy()));
      this.gates = [];
      this.questionText.setVisible(false);
      const qs = spec.questions;
      if (!qs.length) return;
      const perLevel = Math.max(1, Math.ceil(qs.length / spec.levels));
      const levelQs = Array.from({ length: perLevel }, (_, i) => qs[((this.level - 1) * perLevel + i) % qs.length]);
      this.gates = levelQs.map((q, i) => {
        const lanes = Phaser.Utils.Array.Shuffle([...Array(spec.lanes).keys()]);
        const labels = Array.from({ length: spec.lanes }, (_, lane) => {
          const choice = lanes.indexOf(lane);
          const text = choice < q.choices.length ? q.choices[choice] : "✖";
          const obj = this.add
            .text(laneX(lane), -100, text, {
              fontSize: "18px",
              fontStyle: "bold",
              color: "#1f2937",
              backgroundColor: "#fde68a",
              padding: { x: 6, y: 4 },
              align: "center",
              wordWrap: { width: laneW - 10 },
            })
            .setOrigin(0.5)
            .setDepth(6)
            .setVisible(false);
          return { obj, lane };
        });
        return {
          d: (this.finishDist() * (i + 1)) / (levelQs.length + 1),
          question: q.question,
          answer: q.choices[q.answer],
          correctLane: lanes[q.answer],
          labels,
          announced: false,
        };
      });
    }

    /** Distance before a gate when its question appears: about 5 seconds of driving. */
    gateLead() {
      return this.baseSpeed() * 5;
    }

    updateGates(time: number) {
      for (const g of [...this.gates]) {
        const ahead = g.d - this.dist;
        if (!g.announced && ahead < this.gateLead()) {
          g.announced = true;
          sfx("click");
          this.questionText.setText(`❓ ${g.question}`).setVisible(true);
          g.labels.forEach((l) => l.obj.setVisible(true));
        }
        if (!g.announced) continue;
        const y = Math.max(LABEL_TOP, PLAYER_Y - ahead);
        g.labels.forEach((l) => l.obj.setY(y));
        if (ahead <= 0) this.passGate(g, time);
      }
    }

    passGate(g: Gate, time: number) {
      g.labels.forEach((l) => l.obj.destroy());
      this.gates.splice(this.gates.indexOf(g), 1);
      const right = this.lane === g.correctLane;
      if (right) {
        sfx("good");
        this.score += 50;
        this.boostUntil = time + 1500;
        onHud({ score: this.score });
      } else {
        sfx("bad");
        this.slowUntil = time + 1000;
      }
      this.questionText.setText(right ? "✅ Correct! +50" : `💡 The answer is ${g.answer}`);
      this.time.delayedCall(1800, () => {
        if (!this.gates.some((x) => x.announced)) this.questionText.setVisible(false);
      });
    }

    steer(dir: -1 | 1) {
      if (this.over || this.betweenLevels) return;
      const next = Phaser.Math.Clamp(this.lane + dir, 0, spec.lanes - 1);
      if (next === this.lane) return;
      this.lane = next;
      sfx("click");
      this.tweens.add({ targets: this.hero, x: laneX(next), duration: 140, ease: "Quad.easeOut" });
    }

    spawn() {
      const lane = Math.floor(Math.random() * spec.lanes);
      const roll = Math.random();
      const kind: Thing["kind"] = spec.bonus && roll < 0.07 ? "bonus" : roll < 0.3 ? "pickup" : "obstacle";
      const emoji = kind === "bonus" ? "⚡" : kind === "pickup" ? pick(spec.pickups) : pick(spec.obstacles);
      const obj = this.add.text(laneX(lane), -50, emoji, { fontSize: kind === "obstacle" ? "44px" : "34px" }).setOrigin(0.5);
      this.things.push({ obj, lane, d: this.dist + PLAYER_Y + 60, kind });
      // Sometimes a second obstacle, but always leave a free lane.
      if (kind === "obstacle" && spec.lanes > 2 && Math.random() < spec.obstacleDensity / 25) {
        const other = (lane + 1 + Math.floor(Math.random() * (spec.lanes - 1))) % spec.lanes;
        const o2 = this.add.text(laneX(other), -50, pick(spec.obstacles), { fontSize: "44px" }).setOrigin(0.5);
        this.things.push({ obj: o2, lane: other, d: this.dist + PLAYER_Y + 60, kind: "obstacle" });
      }
    }

    update(time: number, delta: number) {
      if (this.over || this.betweenLevels) return;
      const dt = delta / 1000;

      // Steering on key/button press edges.
      const left = this.keys.left.isDown || !!controls.current?.left;
      const right = this.keys.right.isDown || !!controls.current?.right;
      if (left && !this.held.left) this.steer(-1);
      if (right && !this.held.right) this.steer(1);
      this.held = { left, right };

      let speed = this.baseSpeed();
      if (this.keys.up.isDown) speed *= 1.15;
      if (time < this.boostUntil) speed *= 1.45;
      if (time < this.slowUntil) speed *= 0.45;
      this.dist += speed * dt;
      this.hero.setAlpha(time < this.hurtUntil ? (Math.floor(time / 100) % 2 ? 0.3 : 1) : 1);

      // Scenery scroll.
      for (const dash of this.dashes) dash.y = ((dash.y + speed * dt + 40) % 640) - 40;
      for (const d of this.decor) {
        d.y += speed * dt;
        if (d.y > HEIGHT + 20) d.y -= HEIGHT + 40;
      }

      // Keep the road clear around answer gates so the player can focus on the question.
      const gateNear = this.gates.some((g) => g.d - this.dist < this.gateLead() + 300);
      if (gateNear) this.nextSpawnAt = Math.max(this.nextSpawnAt, this.dist + 200);
      if (this.dist >= this.nextSpawnAt) {
        this.spawn();
        this.nextSpawnAt = this.dist + (560 - spec.obstacleDensity * 38) * (0.8 + Math.random() * 0.5);
      }

      this.updateGates(time);

      for (const t of [...this.things]) {
        t.obj.y = PLAYER_Y - (t.d - this.dist);
        if (t.lane === this.lane && Math.abs(t.obj.y - PLAYER_Y) < 38) {
          this.hit(t, time);
          if (this.over) return;
        } else if (t.obj.y > HEIGHT + 50) {
          t.obj.destroy();
          this.things.splice(this.things.indexOf(t), 1);
        }
      }

      for (const r of this.rivals) {
        r.d += this.baseSpeed() * r.pace * dt;
        r.nextTurn -= delta;
        if (r.nextTurn <= 0) {
          r.lane = Phaser.Math.Clamp(r.lane + (Math.random() < 0.5 ? -1 : 1), 0, spec.lanes - 1);
          r.nextTurn = 1500 + Math.random() * 2500;
        }
        r.x += (laneX(r.lane) - r.x) * Math.min(1, dt * 4);
        const y = PLAYER_Y - (r.d - this.dist);
        r.obj.setPosition(r.x, y);
        r.label.setPosition(r.x, y - 34);
        // Bumping a rival slows you down a little (no lives lost).
        if (Math.abs(r.x - this.hero.x) < laneW * 0.6 && Math.abs(y - PLAYER_Y) < 40 && time > this.slowUntil) {
          this.slowUntil = time + 400;
          r.d += 30;
        }
      }

      const toGo = this.finishDist() - this.dist;
      if (toGo < PLAYER_Y + 60) this.finishLine.setVisible(true).setY(PLAYER_Y - toGo);
      const place = 1 + this.rivals.filter((r) => r.d > this.dist).length;
      const pct = Math.min(100, Math.round((this.dist / this.finishDist()) * 100));
      onHud({ extra: `${ordinal(place)} of ${this.rivals.length + 1} · ${pct}%` });

      if (toGo <= 0) this.crossFinish(place);
    }

    hit(t: Thing, time: number) {
      if (t.kind === "obstacle") {
        if (time < this.hurtUntil) return;
        sfx("bad");
        this.cameras.main.shake(180, 0.012);
        this.hurtUntil = time + 1500;
        this.slowUntil = time + 900;
        if (spec.lives > 0) {
          this.lives -= 1;
          onHud({ lives: this.lives });
          if (this.lives <= 0) return this.finish("lost", "Crashed out!");
        }
        return;
      }
      t.obj.destroy();
      this.things.splice(this.things.indexOf(t), 1);
      sfx("good");
      const points = t.kind === "bonus" ? 50 : 10;
      if (t.kind === "bonus") this.boostUntil = time + 1800;
      this.score += points;
      onHud({ score: this.score });
      const pop = this.add.text(this.hero.x, PLAYER_Y - 40, t.kind === "bonus" ? "BOOST!" : `+${points}`, {
        fontSize: "22px",
        color: "#fff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: pop.y - 50, alpha: 0, duration: 700, onComplete: () => pop.destroy() });
    }

    crossFinish(place: number) {
      this.score += PLACE_POINTS[place - 1] ?? 20;
      onHud({ score: this.score });
      if (this.level >= spec.levels) {
        return this.finish("won", place === 1 ? "You won the race! 🏆" : `You finished ${ordinal(place)}!`);
      }
      this.betweenLevels = true;
      sfx("level");
      onHud({ status: "levelup", message: `${ordinal(place)} place! Level ${this.level + 1} next` });
      this.time.delayedCall(1600, () => {
        this.level += 1;
        this.betweenLevels = false;
        this.startLevel();
      });
    }

    finish(status: "won" | "lost", message: string) {
      this.over = true;
      sfx(status === "won" ? "win" : "lose");
      onHud({ status, message, score: this.score });
    }
  };
};
