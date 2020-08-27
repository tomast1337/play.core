/**
Some GLSL functions ported to JS
TODO: add description
*/

export default {
	map,
	fract,
	lerp,
	clamp,
	sign,
	mix,
	smoothstep,
	smootherstep
}

// Maps a value v from range 'in' to range 'out'
export function map(v, inA, inB, outA, outB){
	return outA + (outB - outA) * ((v - inA) / (inB - inA))
}

// Returns the fractional part of a float
export function fract(v) {
	return v - Math.floor(v)
}

// Performs linear interpolation on two floats
export function lerp(a, b, t) {
	return a + (b - a) * t
}

// Clamps a value between min and max
export function clamp(v, min, max) {
	if (v < min) return min
	if (v > max) return max
	return v
}

// Returns -1 for negative numbers, +1 for positive numbers, 0 for zero
export function sign(n) {
	if (n > 0) return  1
	if (n < 0) return -1
	return 0
}

// GLSL mix
export function mix(v1, v2, a){
	return v1 * (1 - a) + v2 * a
}

// GLSL smoothstep
// https://en.wikipedia.org/wiki/Smoothstep
export function smoothstep(edge0, edge1, t) {
  	const x = clamp((t - edge0) / (edge1 - edge0), 0, 1)
  	return x * x * (3 - 2 * x)
}

// GLSL smootherstep
// https://en.wikipedia.org/wiki/Smoothstep
export function smootherstep(edge0, edge1, t) {
  const x = clamp((t - edge0) / (edge1 - edge0), 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}
