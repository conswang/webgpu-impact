struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>
};

@binding(0) @group(0) var<uniform> transform: TransformData;

struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) Color : vec4<f32>,
    @location(1) UV: vec2<f32>,
    @location(2) NormalizedPos : vec4<f32>
};

@vertex
fn vs_main(@location(0) pos: vec3<f32>, @location(1) col: vec3<f32>, @location(2) uv: vec2<f32>) -> Fragment {
    var output : Fragment;
    output.Position = transform.projection * transform.view * transform.model * vec4<f32>(pos, 1.0);
    output.Color = vec4<f32>(col, 1.0);
    output.UV = uv;
    output.NormalizedPos = 0.5 * (vec4(pos, 0.0) + vec4(1.0, 1.0, 1.0, 1.0));
    return output;
}