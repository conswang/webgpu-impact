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
    var lambert : f32 = max(dot(Normal.xyz, normalize(uniforms.eyePos.xyz - Position.xyz)), 0.0);
    var ambient : f32 = 0.25; 
    
    return vec4<f32>(textureColor.xyz * (lambert + ambient), 1.0);
}