struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>
};

@binding(0) @group(0) var<uniform> transform: TransformData;
@binding(1) @group(0) var mySampler: sampler;
@binding(2) @group(0) var myTexture: texture_2d_array<f32>;

struct VSOut {
    @builtin(position) Position: vec4<f32>,
    @location(0)       uvs     : vec2<f32>,
    @location(1)       texId   : f32
};

@vertex
fn vs_main(@location(0) inPos     : vec3<f32>,
		   @location(1) texCoords : vec2<f32>,
           @location(2) texId     : i32        ) -> VSOut  
{ 
  var vm : mat4x4<f32> = transform.view;
  vm[3][0]  = 0.0;
  vm[3][1]  = 0.0;
  vm[3][2]  = 0.0;
  
  var vsOut: VSOut;
  vsOut.Position = transform.projection * vm * vec4<f32>( inPos*2.0, 1.0);
  vsOut.uvs      = texCoords;
  vsOut.texId    = f32(texId);
  return vsOut;

}

@fragment
fn fs_main( @location(0) uvs    : vec2<f32>,
		    @location(1) texId  : f32       ) -> @location(0) vec4<f32> 
{
    let tid = i32(texId);
	if ( tid < 0 )
    {
    	return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
    return textureSample(myTexture, mySampler, uvs, tid );
}