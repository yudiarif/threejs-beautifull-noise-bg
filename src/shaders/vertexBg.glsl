uniform float uTime;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;


void main() {
    vPosition = position;
    vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}