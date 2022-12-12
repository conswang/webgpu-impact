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
    // var textureColor : vec4<f32> = textureSample(texture, textureSampler, UV);
    // var lambert : f32 = max(dot(Normal.xyz, normalize(uniforms.eyePos.xyz - Position.xyz)), 0.0);
    // var ambient : f32 = 0.25; 

    var sobelx : mat3x3<f32> = mat3x3<f32>(1, 2, 1, 
                                           0, 0, 0, 
                                           -1, -2, -1);

    var sobely : mat3x3<f32> = mat3x3<f32>(1, 0, -1, 
                                           2, 0, -2, 
                                           1, 0, -1);

    var mag : mat3x3<f32> = mat3x3<f32>(0, 0, 0, 
                                        0, 0, 0, 
                                        0, 0, 0);

    for(var i: i32 = 0; i < 3; i++) {
        for(var j: i32 = 0; j < 3; j++) {
            var coords : vec2<f32> = vec2<f32>(UV[0] + (f32(i) - 1.0) * 1.0/512.0, UV[1] + (f32(j) - 1.0) * 1.0/512.0);
            mag[i][j] = length(textureSample(texture, textureSampler, coords));
        }
    }

    var x : f32 = dot(sobelx[0], mag[0]) + dot(sobelx[1], mag[1]) + dot(sobelx[2], mag[2]);
    var y : f32 = dot(sobely[0], mag[0]) + dot(sobely[1], mag[1]) + dot(sobely[2], mag[2]);

    var z : f32 = sqrt(x * x + y * y);

    var toonDim : f32 = 6.0;
    // var finalcolor : vec3<f32> = textureColor.xyz * (lambert + ambient);
    // finalcolor *= toonDim;
    // finalcolor = vec3<f32> (floor(finalcolor.x)/toonDim, floor(finalcolor.y)/toonDim, floor(finalcolor.z)/toonDim);

    return vec4<f32>(z, z, z, 1.0);
}