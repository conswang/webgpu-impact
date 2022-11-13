(()=>{"use strict";const t="struct TransformData {\r\n    model: mat4x4<f32>,\r\n    view: mat4x4<f32>,\r\n    projection: mat4x4<f32>\r\n};\r\n\r\n@binding(0) @group(0) var<uniform> transform: TransformData;\r\n\r\nstruct Fragment {\r\n    @builtin(position) Position : vec4<f32>,\r\n    @location(0) Color : vec4<f32>\r\n};\r\n\r\n@vertex\r\nfn vs_main(@location(0) pos: vec3<f32>, @location(1) col: vec3<f32>) -> Fragment {\r\n    var output : Fragment;\r\n    output.Position = transform.projection * transform.view * transform.model * vec4<f32>(pos, 1.0);\r\n    output.Color = vec4<f32>(col, 1.0);\r\n    return output;\r\n}\r\n\r\n@fragment\r\nfn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {\r\n    return Color;\r\n}";class e{constructor(t){this.vertCount=0,this.positions=new Array,this.colors=new Array,this.addVertex({pos:[0,0,.5],col:[1,0,0]}),this.addVertex({pos:[0,-.5,-.5],col:[0,1,0]}),this.addVertex({pos:[0,.5,-.5],col:[0,0,1]}),this.populateVBO();const e=GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,i={size:this.vertDataVBO.byteLength,usage:e,mappedAtCreation:!0};this.buffer=t.createBuffer(i),new Float32Array(this.buffer.getMappedRange()).set(this.vertDataVBO),this.buffer.unmap(),this.bufferLayout={arrayStride:24,attributes:[{shaderLocation:0,format:"float32x3",offset:0},{shaderLocation:1,format:"float32x3",offset:12}]}}addVertex(t){console.log("adding vertex"),console.log(t.pos),console.log(t.col),this.positions.push(t.pos),this.colors.push(t.col),this.vertCount++}populateVBO(){for(var t=new Array,e=0;e<this.vertCount;e++)t.push(this.positions[e][0]),t.push(this.positions[e][1]),t.push(this.positions[e][2]),t.push(this.colors[e][0]),t.push(this.colors[e][1]),t.push(this.colors[e][2]);this.vertDataVBO=new Float32Array(t)}}var i,r=1e-6,o="undefined"!=typeof Float32Array?Float32Array:Array;function s(){var t=new o(3);return o!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t}function n(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t}function a(t,e){var i=e[0],r=e[1],o=e[2],s=i*i+r*r+o*o;return s>0&&(s=1/Math.sqrt(s)),t[0]=e[0]*s,t[1]=e[1]*s,t[2]=e[2]*s,t}function h(){var t=new o(16);return o!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0),t[0]=1,t[5]=1,t[10]=1,t[15]=1,t}Math.random,Math.PI,Math.hypot||(Math.hypot=function(){for(var t=0,e=arguments.length;e--;)t+=arguments[e]*arguments[e];return Math.sqrt(t)}),s(),i=new o(2),o!=Float32Array&&(i[0]=0,i[1]=0);class u{constructor(t,e,i,r,h,u,c,f){var l,d,p;this.eye=s(),this.ref=s(),this.up=s(),this.right=s(),this.look=s(),this.fovy=t,this.aspect=(l=e,d=i,(p=new o(2))[0]=l,p[1]=d,p),this.nearClip=r,this.farClip=h,n(this.eye,u),n(this.ref,c),n(this.up,f),function(t,e,i){t[0]=e[0]-i[0],t[1]=e[1]-i[1],t[2]=e[2]-i[2]}(this.look,c,u),a(this.look,this.look),function(t,e,i){var r=e[0],o=e[1],s=e[2],n=i[0],a=i[1],h=i[2];t[0]=o*h-s*a,t[1]=s*n-r*h,t[2]=r*a-o*n}(this.right,this.look,f),a(this.right,this.right)}project(){var t=h();return function(t,e,i,r,o){var s,n=1/Math.tan(e/2);t[0]=n/i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,null!=o&&o!==1/0?(s=1/(r-o),t[10]=(o+r)*s,t[14]=2*o*r*s):(t[10]=-1,t[14]=-2*r)}(t,this.fovy,this.aspect[0]/this.aspect[1],this.nearClip,this.farClip),t}view(){var t=h();return function(t,e,i,o){var s,n,a,h,u,c,f,l,d,p,v=e[0],m=e[1],y=e[2],g=o[0],b=o[1],w=o[2],B=i[0],M=i[1],x=i[2];Math.abs(v-B)<r&&Math.abs(m-M)<r&&Math.abs(y-x)<r?function(t){t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1}(t):(f=v-B,l=m-M,d=y-x,s=b*(d*=p=1/Math.hypot(f,l,d))-w*(l*=p),n=w*(f*=p)-g*d,a=g*l-b*f,(p=Math.hypot(s,n,a))?(s*=p=1/p,n*=p,a*=p):(s=0,n=0,a=0),h=l*a-d*n,u=d*s-f*a,c=f*n-l*s,(p=Math.hypot(h,u,c))?(h*=p=1/p,u*=p,c*=p):(h=0,u=0,c=0),t[0]=s,t[1]=h,t[2]=f,t[3]=0,t[4]=n,t[5]=u,t[6]=l,t[7]=0,t[8]=a,t[9]=c,t[10]=d,t[11]=0,t[12]=-(s*v+n*m+a*y),t[13]=-(h*v+u*m+c*y),t[14]=-(f*v+l*m+d*y),t[15]=1)}(t,this.eye,this.ref,this.up),t}model(){var t=h();return function(t,e,i,o){var s,n,a,h,u,c,f,l,d,p,v,m,y,g,b,w,B,M,x,P,C,A,V,F,G=o[0],D=o[1],O=o[2],U=Math.hypot(G,D,O);U<r||(G*=U=1/U,D*=U,O*=U,s=Math.sin(0),a=1-(n=Math.cos(0)),h=e[0],u=e[1],c=e[2],f=e[3],l=e[4],d=e[5],p=e[6],v=e[7],m=e[8],y=e[9],g=e[10],b=e[11],w=G*G*a+n,B=D*G*a+O*s,M=O*G*a-D*s,x=G*D*a-O*s,P=D*D*a+n,C=O*D*a+G*s,A=G*O*a+D*s,V=D*O*a-G*s,F=O*O*a+n,t[0]=h*w+l*B+m*M,t[1]=u*w+d*B+y*M,t[2]=c*w+p*B+g*M,t[3]=f*w+v*B+b*M,t[4]=h*x+l*P+m*C,t[5]=u*x+d*P+y*C,t[6]=c*x+p*P+g*C,t[7]=f*x+v*P+b*C,t[8]=h*A+l*V+m*F,t[9]=u*A+d*V+y*F,t[10]=c*A+p*V+g*F,t[11]=f*A+v*V+b*F,e!==t&&(t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]))}(t,t,0,[0,0,1]),t}}var c=function(t,e,i,r){return new(i||(i=Promise))((function(o,s){function n(t){try{h(r.next(t))}catch(t){s(t)}}function a(t){try{h(r.throw(t))}catch(t){s(t)}}function h(t){var e;t.done?o(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e)}))).then(n,a)}h((r=r.apply(t,e||[])).next())}))};const f=document.getElementById("gfx-main"),l=new class{constructor(t){this.render=()=>{this.device.queue.writeBuffer(this.uniformBuffer,0,this.camera.model()),this.device.queue.writeBuffer(this.uniformBuffer,64,this.camera.view()),this.device.queue.writeBuffer(this.uniformBuffer,128,this.camera.project());const t=this.device.createCommandEncoder(),e=this.context.getCurrentTexture().createView(),i=t.beginRenderPass({colorAttachments:[{view:e,clearValue:{r:.5,g:0,b:.25,a:1},loadOp:"clear",storeOp:"store"}]});i.setPipeline(this.pipeline),i.setBindGroup(0,this.bindGroup),i.setVertexBuffer(0,this.mesh.buffer),i.draw(this.mesh.vertCount,1,0,0),i.end(),this.device.queue.submit([t.finish()])},this.canvas=t,this.camera=new u(Math.PI/4,t.width,t.height,.1,10,[-2,0,2],[0,0,0],[0,0,1])}initialize(){return c(this,void 0,void 0,(function*(){yield this.setupDevice(),this.createAssets(),yield this.makePipeline(),this.render()}))}setupDevice(){var t,e;return c(this,void 0,void 0,(function*(){this.adapter=yield null===(t=navigator.gpu)||void 0===t?void 0:t.requestAdapter(),this.device=yield null===(e=this.adapter)||void 0===e?void 0:e.requestDevice(),this.context=this.canvas.getContext("webgpu"),this.format="bgra8unorm",this.context.configure({device:this.device,format:this.format,alphaMode:"opaque"})}))}makePipeline(){return c(this,void 0,void 0,(function*(){this.uniformBuffer=this.device.createBuffer({size:192,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const e=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{}}]});this.bindGroup=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBuffer}}]});const i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.pipeline=this.device.createRenderPipeline({layout:i,vertex:{module:this.device.createShaderModule({code:t}),entryPoint:"vs_main",buffers:[this.mesh.bufferLayout]},fragment:{module:this.device.createShaderModule({code:t}),entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"}})}))}createAssets(){this.mesh=new e(this.device)}}(f);l.initialize()})();