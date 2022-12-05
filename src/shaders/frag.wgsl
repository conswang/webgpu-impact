@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var texture: texture_2d<f32>;

@fragment
fn fs_main(
    @location(0) Color: vec4<f32>,
    @location(1) UV: vec2<f32>,
    @location(2) NormalizedPos : vec4<f32>
) -> @location(0) vec4<f32> {
    return textureSample(texture, textureSampler, UV) * NormalizedPos;
}