struct Uniforms {
            lightPos : vec4<f32>, 
            eyePos : vec4<f32>,
        };

@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var texture: texture_2d<f32>;

@fragment
fn fs_main(
    @builtin(position) Position : vec4<f32>,
    @location(0) Normal: vec4<f32>,
    @location(1) UV: vec2<f32>,
    @location(2) NormalizedPos : vec4<f32>
) -> @location(0) vec4<f32> {
    var textureColor : vec4<f32> = textureSample(texture, textureSampler, UV);
    var lambert : f32 = max(dot(normalize(Normal.xyz), normalize(uniforms.lightPos.xyz - Position.xyz)), 0.0);
    var ambient : f32 = 0.25; 

    var toonDim : f32 = 10.0;
    var finalcolor : vec3<f32> = textureColor.xyz * (lambert + ambient);
    finalcolor *= toonDim;
    finalcolor = vec3<f32> (floor(finalcolor.x)/toonDim, floor(finalcolor.y)/toonDim, floor(finalcolor.z)/toonDim);

    return vec4<f32>(finalcolor, 1.0);
}