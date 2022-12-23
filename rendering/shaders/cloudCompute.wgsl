
//Reference: https://webgpulab.xbdev.net/index.php?page=editor&id=clouds&
fn mysmoothstep(edge0: f32, edge1: f32, x: f32) -> f32
{
  var t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

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

struct Time {
    currSec: f32
}

@binding(0) @group(0) var outputTex : texture_storage_2d<rgba8unorm, write>;
@binding(1) @group(0) var<uniform> time : Time;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId      : vec3<u32>,
		   @builtin(local_invocation_id)  localId       : vec3<u32>,
		   @builtin(workgroup_id)         workgroupId   : vec3<u32>,
           @builtin(num_workgroups)	      workgroupSize : vec3<u32>
           )
{
    if (globalId.x >= u32(1024 * 1024)){
        return;
    }

    //Get Ray Dir
    var writeIndex = vec2<i32>(i32(globalId.x / 100), i32(globalId.x % 100));

    var uvs =  vec2<f32>(f32(globalId.x / 100/100), f32(globalId.x % 100/100));
    
    var m = mat2x2<f32>( vec2<f32>(1.6,  1.2), vec2<f32>(-1.2,  1.6) );
    var cloudscale = 1.1;
    var speed = 0.03;
    var clouddark = 0.5;
    var cloudlight = 0.3;
    var cloudcover = 0.2;
    var cloudalpha = 8.0;
    var skytint = 0.5;
    var skycolour1 = vec3<f32>(0.2, 0.4, 0.6);
    var skycolour2 = vec3<f32>(0.4, 0.7, 1.0);

    var iTime = time.currSec;//uniforms.mytimer;

    var p  = uvs.xy;
    var uv = p;    
    var time = iTime * speed;
    var q = fbm(uv * cloudscale * 0.5);
    
    //ridged noise shape
    var r = 0.0;
    uv = uv * cloudscale;
    uv = uv - q - time;
    var weight = 0.8;
    for (var i=0; i<8; i=i+1)
    {
        r = r + abs(weight*noise( uv ));
        uv = m*uv + time;
        weight = weight * 0.7;
    }
    
    //noise shape
    var f = 0.0;
    uv = p;
    uv = uv * cloudscale;
    uv = uv - q - time;
    weight = 0.7;
    for (var i=0; i<8; i=i+1)
    {
        f = f + weight*noise( uv );
        uv = m*uv + time;
        weight = weight * 0.6;
    }
    
    f = f * (r + f);
    
    //noise colour
    var c = 0.0;
    time = iTime * speed * 2.0;
    uv = p;
    uv = uv * cloudscale*2.0;
    uv = uv - (q - time);
    weight = 0.4;
    for (var i=0; i<7; i=i+1)
    {
        c = c + weight*noise( uv );
        uv = m*uv + time;
        weight = weight * 0.6;
    }
    
    //noise ridge colour
    var c1 = 0.0;
    time = iTime * speed * 3.0;
    uv = p;
    uv = uv * cloudscale*3.0;
    uv = uv - q - time;
    weight = 0.4;
    for (var i=0; i<7; i=i+1)
    {
        c1 = c1 + abs(weight*noise( uv ));
        uv = m*uv + time;
        weight = weight * 0.6;
    }
  
    c = c + c1;
    
    var skycolour = mix(skycolour2, skycolour1, p.y);
    var cloudcolour = vec3<f32>(1.1, 1.1, 0.9) * clamp((clouddark + cloudlight*c), 0.0, 1.0);
   
    f = cloudcover + cloudalpha*f*r;
    
    var result = mix(skycolour, 
                     clamp(skytint * skycolour + cloudcolour, vec3<f32>(0.0), vec3<f32>(1.0) ), 
                     clamp(f + c, 0.0, 1.0) );
    
    var frag_Color = vec4<f32>( result, 1.0 );
    
    textureStore(outputTex, writeIndex, vec4<f32>(result, 1.0));
    
}