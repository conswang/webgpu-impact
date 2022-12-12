struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>
};

struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) Color : vec4<f32>
};

@binding(0) @group(0) var<uniform> transform: TransformData;

@vertex
fn vs_main(@builtin(instance_index) InstanceIdx: u32,
           @builtin(vertex_index) VertexIdx : u32,
           @location(0) pos: vec3<f32>, 
           @location(1) col: vec3<f32>) -> Fragment {
    var output : Fragment;
    var worldPos = pos; //vec3<f32>(0.0, 1.0, 0.0);
    output.Position = transform.projection * transform.view * transform.model * vec4<f32>(worldPos, 1.0);
    
    return output;
}

@fragment
fn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(0., .4, 0., 1.);
}