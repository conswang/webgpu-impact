struct StemPos {
    pos: array<vec4<f32>, 1000>
}

struct TipPos {
    pos: array<vec4<f32>, 1000>
}

@binding(0) @group(0) var<uniform> stemPos : StemPos;
@binding(1) @group(0) var<storage, read_write> tipPos : TipPos;

@compute @workgroup_size(64)
fn cp_main(@builtin(global_invocation_id) globalId      : vec3<u32>,
		   @builtin(local_invocation_id)  localId       : vec3<u32>,
		   @builtin(workgroup_id)         workgroupId   : vec3<u32>,
           @builtin(num_workgroups)	      workgroupSize : vec3<u32>
           )
{
    if (globalId.x >= u32(1000)){
        return;
    }

    tipPos.pos[globalId.x] = vec4<f32>(tipPos.pos[globalId.x]);//vec4<f32>(1.0, 0.0, 0.0, 1.0);
}