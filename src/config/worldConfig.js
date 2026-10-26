export const worldConfig = {
  seed: 71421, // Repeatable terrain and scenery layout.
  size: 1600, // Width of the finite square seabed in metres.
  heightVariation: 4, // Gentle dune relief in metres.
  surface: 46, // Shared mean sea level; terrain is near zero.
  aboveWaterHeight: 2, // Numeric breach guard; swimming GUPs settle at the surface.
  boundaryMargin: 90, // Soft slowdown zone at the map edge.
};
export {cameraConfig} from './cameraConfig.js';


