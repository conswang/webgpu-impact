struct StemPos {
    pos: array<vec4<f32>, 1000>
}

struct TipPos {
    pos: array<vec4<f32>, 1000>
}

struct Time {
    currSec: f32
}

struct InitTipPos {
    pos: array<vec4<f32>, 1000>
}

@binding(0) @group(0) var<uniform> stemPos : StemPos;
@binding(1) @group(0) var<storage, read_write> tipPos : TipPos;
@binding(2) @group(0) var<uniform> time : Time;
@binding(3) @group(0) var<uniform> initTipPos : InitTipPos;

fn hash( p: vec2<f32> ) -> vec2<f32>
{
  var pp  = vec2<f32>( dot(p,vec2<f32>(127.1,311.7)), 
                       dot(p,vec2<f32>(269.5,183.3)));

  return -1.0 + 2.0*fract(sin(pp)*43758.5453123);
}

fn noise( p: vec2<f32> ) -> f32
{
    var K1 = 0.366025404; // (sqrt(3)-1)/2;
    var K2 = 0.211324865; // (3-sqrt(3))/6;
    var i = floor(p + (p.x+p.y)*K1);  
    var a = p - i + (i.x+i.y)*K2;

    var o = vec2<f32>(1.0,0.0); // (a.x>a.y) ? vec2<f32>(1.0,0.0) : vec2<f32>(0.0,1.0); 
    if ( a.x < a.y ) { o = vec2<f32>(0.0,1.0); }

    //var o = (a.x>a.y) ? vec2<f32>(1.0,0.0) : vec2<f32>(0.0,1.0); 
    //vec2 of = 0.5 + 0.5*vec2<f32>(sign(a.x-a.y), sign(a.y-a.x));

    var b = a - o + K2;
    var c = a - 1.0 + 2.0*K2;

    var h = max(0.5-vec3<f32>(dot(a,a), dot(b,b), dot(c,c) ), vec3<f32>(0.0,0.0,0.0) );

    var n = h*h*h*h*vec3<f32>( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));

    return dot(n, vec3<f32>(70.0));  
}

fn fbm(n: vec2<f32>) -> f32
{
  var m = mat2x2<f32>( vec2<f32>(1.6,  1.2), vec2<f32>(-1.2,  1.6) );

  var total = 0.0;
  var amplitude = 0.1;
  var nn = n;
  for (var i = 0; i < 7; i=i+1) 
  {
    total = total + (noise(nn) * amplitude);
    nn = m * n;
    amplitude = amplitude * 0.4;
  }
  return total;
}

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

    //Stiffness
    var recovery = .01 * (initTipPos.pos[globalId.x] - tipPos.pos[globalId.x]);

    //Wind Dir
    //var windDir = vec3



    tipPos.pos[globalId.x] = tipPos.pos[globalId.x] + recovery;
    
}