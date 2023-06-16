import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import vertexBg from "../shaders/vertexBg.glsl";
import fragmentBg from "../shaders/fragmentBg.glsl";
import vertexFresnel from "../shaders/vertexFresnel.glsl";
import fragmentFresnel from "../shaders/fragmentFresnel.glsl";

import { DotScreenShader } from "./customShaders";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import GUI from "lil-gui";
import { gsap } from "gsap";

class WebGL {
  constructor() {
    //scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    //Renderer
    this.container = document.querySelector("main");
    this.renderer = new THREE.WebGLRenderer();
    this.container.appendChild(this.renderer.domElement);
    this.renderer.setPixelRatio(2);

    this.gui = new GUI();
    this.time = 0;
    this.mouse = [];
    this.addCamera();
    this.addMesh();
    this.postprocessing();
    this.addControl();
    this.addLight();
    this.render();
    this.onWindowResize();
    this.addSetting();
    this.onMouseMove();
  }

  get viewport() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    let aspectRatio = width / height;

    return {
      width,
      height,
      aspectRatio,
    };
  }

  addCamera() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.camera = new THREE.PerspectiveCamera(70, this.viewport.aspectRatio, 0.1, 1000);
    this.camera.position.z = 1.2;
    this.renderer.setSize(this.viewport.width, this.viewport.height);
  }

  addMesh() {
    this.geometry = new THREE.SphereGeometry(1.5, 32, 32);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, resolution: { value: new THREE.Vector4() } },
      vertexShader: vertexBg,
      fragmentShader: fragmentBg,
      //wireframe: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipMapLinearFilter,
      colorSpace: THREE.SRGBColorSpace,
    });

    this.cubeCamera = new THREE.CubeCamera(0.1, 10, this.cubeRenderTarget);
    this.fresnelGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    this.fresnelMaterial = new THREE.ShaderMaterial({
      uniforms: { tCube: { value: 0 } },
      vertexShader: vertexFresnel,
      fragmentShader: fragmentFresnel,
      side: THREE.DoubleSide,
      //wireframe: true,
    });
    this.miniSphere = new THREE.Mesh(this.fresnelGeometry, this.fresnelMaterial);
    this.scene.add(this.miniSphere);
    this.miniSphere.position.x = 0.38;
    this.miniSphere.position.y = 0.22;
    this.miniSphere.position.z = 0.7;
  }

  addLight() {
    this.light = new THREE.DirectionalLight(0xffff, 0.08);
    this.light.position.set(-100, 0, -100);
    this.scene.add(this.light);
  }

  addControl() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.enablePan = true;
    // this.controls.enableZoom = true;
  }

  onWindowResize() {
    this.camera.aspect = this.viewport.aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.uWidth = this.container.offsetWidth;
    this.uHeight = this.container.offsetHeight;
    this.imageAspect = 1;
    let a1;
    let a2;

    if (this.uWidth / this.uHeight > this.imageAspect) {
      a1 = (this.uWidth / this.uHeight) * this.imageAspect;
      a2 = 1;
    } else {
      a1 = 1;
      a2 = this.uWidth / this.uHeight / this.imageAspect;
    }
    this.material.uniforms.resolution.value.x = this.uWidth;
    this.material.uniforms.resolution.value.y = this.uHeight;
    this.material.uniforms.resolution.value.z = a1;
    this.material.uniforms.resolution.value.w = a2;

    this.camera.updateProjectionMatrix();
  }

  onMouseMove() {
    window.addEventListener("mousemove", (event) => {
      this.mouse.x = (event.clientX / this.viewport.width) * 2 - 1;
      this.mouse.y = (event.clientY / this.viewport.height) * 2 - 1;
      this.mesh.position.x = gsap.utils.interpolate(this.mesh.position.x, this.mouse.x / 3, 0.05);
      this.mesh.position.y = gsap.utils.interpolate(this.mesh.position.y, -this.mouse.y / 3, 0.05);
    });
  }

  onWindowResize() {
    this.camera.aspect = this.viewport.aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.viewport.width, this.viewport.height);
  }

  postprocessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const effect1 = new ShaderPass(DotScreenShader);
    effect1.uniforms["scale"].value = 4;
    this.composer.addPass(effect1);
  }
  render() {
    this.time += 0.01;
    this.material.uniforms.uTime.value = this.time;
    this.fresnelMaterial.uniforms.tCube.value = this.cubeRenderTarget.texture;
    this.miniSphere.visible = false;
    this.cubeCamera.update(this.renderer, this.scene);
    this.miniSphere.visible = true;
    this.renderer.render(this.scene, this.camera);
    this.composer.render();
    //this.composer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.render.bind(this));
    //console.log(this.material.uniforms.uTime);
  }

  addSetting() {
    this.cameraFolder = this.gui.addFolder("camera");
    this.cameraFolder.add(this.camera.position, "x", -5, 5);
    this.cameraFolder.add(this.camera.position, "y", -5, 5);
    this.cameraFolder.add(this.camera.position, "z", -5, 5);
    this.cameraFolder.open();
  }
}

new WebGL();
