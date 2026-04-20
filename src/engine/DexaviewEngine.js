/**
 * DexaviewEngine.js
 * -----------------
 * The core simulation engine for Dexaview. This class owns the Three.js WebGPU
 * renderer, the Rapier physics world, and the AI Technical Advisor agent.
 *
 * Lifecycle:
 *   const engine = new DexaviewEngine(canvasElement);
 *   await engine.init();
 *   engine.start();          // begins the render/physics loop
 *   engine.dispose();        // cleans up on unmount
 *
 * The engine emits custom DOM events so that React components can react to
 * simulation state without being tightly coupled to this class:
 *   "dexaview:physics-event"   – a notable physics moment occurred
 *   "dexaview:ai-response"     – the AI advisor produced a message
 *   "dexaview:fps-update"      – current frame rate reading
 */

import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import { TechnicalAdvisorAgent } from "./TechnicalAdvisorAgent.js";
import { IndustrialAssetLoader } from "./IndustrialAssetLoader.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Target physics step in seconds (60 Hz). */
const PHYSICS_STEP = 1 / 60;

/** How many sub-steps Rapier runs per frame to keep tunnelling to a minimum. */
const PHYSICS_SUB_STEPS = 2;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class DexaviewEngine {
  /**
   * @param {HTMLCanvasElement} canvas – the canvas element to render into
   * @param {object}            options
   * @param {string}            options.openAiApiKey – forwarded to the AI agent
   * @param {string}            [options.industryMode="oil_gas"] – tunes default
   *                            physics gravity and AI context prompt
   */
  constructor(canvas, options = {}) {
    this._canvas = canvas;
    this._options = { industryMode: "oil_gas", ...options };

    // Three.js primitives (populated during init)
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._clock = new THREE.Clock();

    // Rapier physics world
    this._physicsWorld = null;
    this._physicsObjects = new Map(); // meshUUID → { body, collider }

    // AI advisor
    this._advisor = null;

    // Asset loader helper
    this._assetLoader = null;

    // Animation frame handle – kept so we can cancel it on dispose
    this._rafHandle = null;

    // Simple FPS tracker
    this._frameCount = 0;
    this._lastFpsTime = performance.now();
  }

  // -------------------------------------------------------------------------
  // Public – Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialises all subsystems. Must be awaited before calling start().
   * Order matters: renderer → physics → AI agent → lighting → asset loader.
   */
  async init() {
    await this._initRenderer();
    await this._initPhysics();
    this._initScene();
    this._initCamera();
    this._initLighting();
    this._advisor = new TechnicalAdvisorAgent({
      apiKey: this._options.openAiApiKey,
      industryMode: this._options.industryMode,
      onResponse: (msg) => this._emit("dexaview:ai-response", { message: msg }),
    });
    this._assetLoader = new IndustrialAssetLoader(
      this._scene,
      this._physicsWorld,
      this._physicsObjects
    );
  }

  /**
   * Kicks off the render + physics loop. Safe to call only after init().
   */
  start() {
    this._clock.start();
    this._loop();
  }

  /**
   * Cleanly tears down WebGPU contexts, cancels animation frames,
   * and removes physics objects. Call this on React component unmount.
   */
  dispose() {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this._renderer?.dispose();
    this._physicsWorld?.free(); // Rapier WASM heap cleanup
  }

  // -------------------------------------------------------------------------
  // Public – Scene manipulation
  // -------------------------------------------------------------------------

  /**
   * Loads a GLB industrial asset into the scene with optional physics.
   * @param {string}  url        – path or URL to the .glb file
   * @param {object}  transform  – { position, rotation, scale } Three.js vectors
   * @param {boolean} withPhysics – attach a Rapier trimesh collider if true
   * @returns {Promise<THREE.Group>} the loaded model group
   */
  async loadAsset(url, transform = {}, withPhysics = true) {
    return this._assetLoader.load(url, transform, withPhysics);
  }

  /**
   * Asks the AI Technical Advisor a question asynchronously.
   * The answer is dispatched as a "dexaview:ai-response" event rather than
   * returned directly, keeping the UI decoupled from async timing.
   * @param {string} question
   */
  askAdvisor(question) {
    this._advisor.ask(question);
  }

  /**
   * Triggers a named physics event (e.g., "blowout", "collapse") at an optional
   * world-space origin. Downstream listeners decide how to visualise it.
   * @param {string}        eventName
   * @param {THREE.Vector3} [origin]
   */
  triggerPhysicsEvent(eventName, origin = new THREE.Vector3()) {
    switch (eventName) {
      case "blowout":
        this._simulateBlowout(origin);
        break;
      case "collapse":
        this._simulateCollapse(origin);
        break;
      default:
        console.warn(`[DexaviewEngine] Unknown physics event: "${eventName}"`);
    }
    this._emit("dexaview:physics-event", { eventName, origin });
  }

  // -------------------------------------------------------------------------
  // Private – Initialisation helpers
  // -------------------------------------------------------------------------

  /**
   * Creates the WebGPU renderer and falls back to WebGL2 when the browser
   * does not yet support WebGPU (e.g., Firefox stable as of mid-2025).
   */
  async _initRenderer() {
    this._renderer = new WebGPURenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: false,
    });

    await this._renderer.init(); // required for WebGPU initialisation

    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;

    // Resize observer keeps the canvas filling its container
    new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = this._canvas;
      this._renderer.setSize(w, h);
      if (this._camera) {
        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();
      }
    }).observe(this._canvas);
  }

  /**
   * Loads Rapier WASM and creates the physics world.
   * Gravity is set to Earth standard; industry-specific tuning can override
   * this after init via physicsWorld.gravity.
   */
  async _initPhysics() {
    await RAPIER.init();
    this._physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  /** Creates the Three.js scene and sets a dark-sky background colour. */
  _initScene() {
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0a0d14);
    this._scene.fog = new THREE.FogExp2(0x0a0d14, 0.015);
  }

  /**
   * Creates the primary perspective camera with a near/far range suited to
   * large industrial environments (offshore rigs, server halls, etc.).
   */
  _initCamera() {
    const { clientWidth: w, clientHeight: h } = this._canvas;
    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    this._camera.position.set(0, 12, 35);
    this._camera.lookAt(0, 0, 0);
  }

  /**
   * Adds ambient and directional lights that mimic an overcast industrial site.
   * A subtle hemisphere light gives the ground a slightly warm bounce.
   */
  _initLighting() {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this._scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.far = 300;
    this._scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x223344, 0x332211, 0.4);
    this._scene.add(hemi);
  }

  // -------------------------------------------------------------------------
  // Private – Render / Physics loop
  // -------------------------------------------------------------------------

  /**
   * Main loop: steps the physics world then renders the scene.
   * Physics runs at a fixed 60 Hz regardless of render frame rate.
   */
  _loop() {
    this._rafHandle = requestAnimationFrame(() => this._loop());

    const delta = this._clock.getDelta();

    // Step physics (fixed timestep prevents tunnelling at low frame rates)
    for (let i = 0; i < PHYSICS_SUB_STEPS; i++) {
      this._physicsWorld.step();
    }

    // Synchronise Three.js mesh positions with Rapier rigid body transforms
    this._physicsObjects.forEach(({ body }, uuid) => {
      const mesh = this._scene.getObjectByProperty("uuid", uuid);
      if (!mesh || body.isFixed()) return;
      const pos = body.translation();
      const rot = body.rotation();
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    this._renderer.render(this._scene, this._camera);
    this._trackFps();
  }

  /**
   * Emits an FPS update event once per second so the UI can display a live
   * frame-rate counter without requiring direct access to this class.
   */
  _trackFps() {
    this._frameCount++;
    const now = performance.now();
    const elapsed = now - this._lastFpsTime;
    if (elapsed >= 1000) {
      const fps = Math.round((this._frameCount * 1000) / elapsed);
      this._emit("dexaview:fps-update", { fps });
      this._frameCount = 0;
      this._lastFpsTime = now;
    }
  }

  // -------------------------------------------------------------------------
  // Private – Physics events
  // -------------------------------------------------------------------------

  /**
   * Simulates a well blowout: applies a large upward impulse to all dynamic
   * bodies within a configurable blast radius of the origin.
   * @param {THREE.Vector3} origin – world-space centre of the blowout
   */
  _simulateBlowout(origin) {
    const BLAST_RADIUS = 15;
    const BLAST_FORCE = 800;

    this._physicsObjects.forEach(({ body }) => {
      if (body.isFixed()) return;
      const pos = body.translation();
      const dx = pos.x - origin.x;
      const dy = pos.y - origin.y;
      const dz = pos.z - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > BLAST_RADIUS) return;

      const falloff = 1 - dist / BLAST_RADIUS;
      const force = BLAST_FORCE * falloff;
      body.applyImpulse({ x: dx * force, y: force * 2, z: dz * force }, true);
    });
  }

  /**
   * Simulates structural collapse: sets all dynamic bodies above a threshold
   * height to kinematic mode and drops them simultaneously.
   * @param {THREE.Vector3} origin
   */
  _simulateCollapse(origin) {
    this._physicsObjects.forEach(({ body }) => {
      if (body.isFixed()) return;
      const pos = body.translation();
      if (pos.y > origin.y) {
        body.applyImpulse({ x: 0, y: -500, z: 0 }, true);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Private – Utility
  // -------------------------------------------------------------------------

  /**
   * Dispatches a typed CustomEvent on the canvas element so React components
   * can subscribe using standard addEventListener calls.
   * @param {string} type
   * @param {object} detail
   */
  _emit(type, detail) {
    this._canvas.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
}
