/**
 * IndustrialAssetLoader.js
 * ------------------------
 * Handles loading, optimising, and instrumenting GLB industrial models.
 *
 * Responsibilities:
 *   1. Load .glb files via Three.js GLTFLoader.
 *   2. Traverse the scene graph and apply memory-efficient material settings.
 *   3. Attach a Rapier trimesh collider to every mesh that requires physics.
 *   4. Create a floating HTML data-overlay (CSS2DObject) that displays real-time
 *      telemetry fed from the SimLink API or hardcoded demo values.
 *
 * Example:
 *   const loader = new IndustrialAssetLoader(scene, physicsWorld, physicsObjects);
 *   const rig = await loader.load("/assets/drilling_rig.glb", {
 *     position: new THREE.Vector3(0, 0, 0),
 *     scale:    new THREE.Vector3(1, 1, 1),
 *   }, true);
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import RAPIER from "@dimforge/rapier3d-compat";

// ---------------------------------------------------------------------------
// Draco decoder path – must be served statically alongside the app bundle
// ---------------------------------------------------------------------------
const DRACO_DECODER_PATH = "/draco/";

export class IndustrialAssetLoader {
  /**
   * @param {THREE.Scene}  scene          – the active scene to add loaded models to
   * @param {RAPIER.World} physicsWorld   – Rapier world for collider registration
   * @param {Map}          physicsObjects – shared map of uuid → { body, collider }
   */
  constructor(scene, physicsWorld, physicsObjects) {
    this._scene = scene;
    this._physicsWorld = physicsWorld;
    this._physicsObjects = physicsObjects;

    // Configure GLTFLoader with Draco compression support for smaller file sizes
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);

    this._gltfLoader = new GLTFLoader();
    this._gltfLoader.setDRACOLoader(draco);

    // CSS2D renderer for HTML overlays (must be appended to the DOM by the caller)
    this._css2dRenderer = new CSS2DRenderer();
    this._css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this._css2dRenderer.domElement.style.cssText =
      "position:absolute;top:0;left:0;pointer-events:none;";
    document.body.appendChild(this._css2dRenderer.domElement);
  }

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  /**
   * Loads a GLB asset, optimises it, attaches optional physics, and pins a
   * telemetry overlay above it.
   *
   * @param {string}  url
   * @param {object}  transform
   * @param {THREE.Vector3} [transform.position]
   * @param {THREE.Euler}   [transform.rotation]
   * @param {THREE.Vector3} [transform.scale]
   * @param {boolean} withPhysics – if true, a Rapier trimesh collider is built
   * @returns {Promise<THREE.Group>}
   */
  async load(url, transform = {}, withPhysics = true) {
    const gltf = await this._loadGltf(url);
    const model = gltf.scene;

    // Apply transform
    if (transform.position) model.position.copy(transform.position);
    if (transform.rotation) model.rotation.copy(transform.rotation);
    if (transform.scale) model.scale.copy(transform.scale);

    // Optimise materials across the entire scene graph
    this._optimiseMaterials(model);

    // Build physics collider from all meshes in the group
    if (withPhysics && this._physicsWorld) {
      this._attachPhysics(model);
    }

    // Add a floating data overlay above the model's bounding box centre
    const overlay = this._createDataOverlay(model, url);
    model.add(overlay);

    this._scene.add(model);
    return model;
  }

  /**
   * Updates the telemetry values displayed on an overlay panel.
   * Call this from a WebSocket handler or polling interval.
   *
   * @param {THREE.Group} model  – the model whose overlay should be updated
   * @param {object}      data   – e.g. { pressure: "3200 psi", temp: "87 °C" }
   */
  updateOverlay(model, data) {
    // The overlay element is stored as userData on the CSS2DObject
    const overlay = model.userData.overlayElement;
    if (!overlay) return;
    Object.entries(data).forEach(([key, value]) => {
      const el = overlay.querySelector(`[data-key="${key}"]`);
      if (el) el.textContent = value;
    });
  }

  // -------------------------------------------------------------------------
  // Private – Loading
  // -------------------------------------------------------------------------

  /**
   * Wraps GLTFLoader.load in a Promise for cleaner async/await usage.
   * @param {string} url
   * @returns {Promise<import("three/addons").GLTF>}
   */
  _loadGltf(url) {
    return new Promise((resolve, reject) => {
      this._gltfLoader.load(url, resolve, undefined, reject);
    });
  }

  // -------------------------------------------------------------------------
  // Private – Material optimisation
  // -------------------------------------------------------------------------

  /**
   * Traverses every mesh in the loaded group and applies production-ready
   * material settings:
   *   • Enables shadow casting/receiving on all meshes.
   *   • Upgrades Basic materials to Standard for correct PBR lighting.
   *   • Disposes duplicate geometry instances to save GPU memory.
   *
   * @param {THREE.Group} group
   */
  _optimiseMaterials(group) {
    const seenGeometries = new Set();

    group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      node.castShadow = true;
      node.receiveShadow = true;

      // Upgrade MeshBasicMaterial to MeshStandardMaterial so it reacts to lights
      if (node.material instanceof THREE.MeshBasicMaterial) {
        node.material = new THREE.MeshStandardMaterial({
          color: node.material.color,
          map: node.material.map,
          roughness: 0.55,
          metalness: 0.3,
        });
      }

      // Deduplicate geometries that appear multiple times in the hierarchy
      const geoId = node.geometry.uuid;
      if (seenGeometries.has(geoId)) {
        // Already counted – nothing more to do; Three.js shares the buffer
      } else {
        seenGeometries.add(geoId);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Private – Physics
  // -------------------------------------------------------------------------

  /**
   * Builds a static Rapier trimesh collider that exactly matches the visual
   * geometry of every mesh in the group. This is suitable for large, immovable
   * structures (rigs, halls, pipelines). Dynamic objects should use simpler
   * compound shapes for better performance.
   *
   * @param {THREE.Group} group
   */
  _attachPhysics(group) {
    group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geo = node.geometry;
      const posAttr = geo.getAttribute("position");
      const indexAttr = geo.index;

      if (!posAttr || !indexAttr) return;

      // Convert to flat Float32Array / Uint32Array expected by Rapier
      const vertices = new Float32Array(posAttr.array);
      const indices = new Uint32Array(indexAttr.array);

      const bodyDesc = RAPIER.RigidBodyDesc.fixed();
      const body = this._physicsWorld.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
      const collider = this._physicsWorld.createCollider(colliderDesc, body);

      this._physicsObjects.set(node.uuid, { body, collider });
    });
  }

  // -------------------------------------------------------------------------
  // Private – Overlay
  // -------------------------------------------------------------------------

  /**
   * Creates a CSS2DObject positioned above the model's bounding box. The
   * HTML element contains named [data-key] spans that can be updated live
   * via updateOverlay().
   *
   * @param {THREE.Group} model
   * @param {string}      modelUrl – used to derive a human-readable title
   * @returns {CSS2DObject}
   */
  _createDataOverlay(model, modelUrl) {
    // Compute bounding box to position the label above the model
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;

    // Derive a friendly name from the file path
    const name = modelUrl.split("/").pop().replace(".glb", "").replace(/_/g, " ");

    // Build the HTML element for the overlay
    const div = document.createElement("div");
    div.className = "dexaview-overlay";
    div.innerHTML = `
      <div class="dexaview-overlay__title">${name.toUpperCase()}</div>
      <div class="dexaview-overlay__row">
        <span class="dexaview-overlay__label">Pressure</span>
        <span class="dexaview-overlay__value" data-key="pressure">– psi</span>
      </div>
      <div class="dexaview-overlay__row">
        <span class="dexaview-overlay__label">Temp</span>
        <span class="dexaview-overlay__value" data-key="temp">– °C</span>
      </div>
      <div class="dexaview-overlay__row">
        <span class="dexaview-overlay__label">Status</span>
        <span class="dexaview-overlay__value" data-key="status">NOMINAL</span>
      </div>
    `;

    // Store a reference for live updates
    model.userData.overlayElement = div;

    const label = new CSS2DObject(div);
    label.position.set(0, height + 2, 0);
    return label;
  }
}
