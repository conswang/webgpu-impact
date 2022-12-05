WebGPU Non-PBR Renderer
==================================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Project 5**

* Constance Wang
  * [LinkedIn]
  * [Website]

* Eyad Almoamen
  * https://www.linkedin.com/in/eyadalmoamen/
  * https://eyadnabeel.com/
 
* Edward Zhang
  * https://www.linkedin.com/in/edwardjczhang/
  * https://zedward23.github.io/personal_Website/  
 
* Tested on: Windows 10 Home, i7-11800H @ 2.3GHz, 16.0GB, NVIDIA GeForce RTX 3060 Laptop GPU

Overview
==================================
![](images/Structure.png)

This project attempts to:
1. Provide a WebGPU implementation of a non-photorealistic renderer. This will be done by implementing the non-PBR shaders as described in this article: [Blender NPR: Recreating the Genshin Impact Shader](https://www.artstation.com/blogs/bjayers/9oOD/blender-npr-recreating-the-genshin-impact-shader) using vertex and fragment shaders
2. Enrichen the ecosystem of compute shader applications in WebGPU by rendering real-time grass according to this paper: [Responsive Real-Time Grass Rendering for General 3D Scenes](https://www.cg.tuwien.ac.at/research/publications/2017/JAHRMANN-2017-RRTG/JAHRMANN-2017-RRTG-draft.pdf)

Installation
==================================
`webgpu-impact` is built with [Typescript](https://www.typescriptlang.org/)
and compiled using [Next.js](https://nextjs.org/). Building the project
requires an installation of [Node.js](https://nodejs.org/en/).

- Clone this repo
- Install dependencies: `npm install`.
- To run and build, oepn console to run 'npm run dev'
- Can only be viewed in Google Chrome Canary or Chrome Developer
- Make sure to '--enable-unsafe-webgpu' in Chrome Settings

Compute Pipeline
==================================
Grass Parameters: Forces, control points, stem positions

![](images/ComputePipeline.png)

Grass in the scene are defined as simple triangles; one vertex of that triangle also serves as the control point that the forces in the scene will act on when animated.

Render Pipeline
==================================
GLTF Loading
UV Texturing
Grass Instance Rendering

Future Direction
==================================
- Animation & Skinning
- Ray-marched Clouds
- Improved Camera Functionality

Bloopers
==================================
