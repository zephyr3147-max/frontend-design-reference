'use strict';
const canvas=document.getElementById('world'), gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){document.getElementById('error').style.display='block';document.getElementById('error').textContent='当前浏览器未启用 WebGL，请使用支持硬件加速的浏览器打开。';throw Error('WebGL unavailable');}
const vertex=`attribute vec3 position;attribute vec3 normal;uniform mat4 model;uniform mat4 viewProjection;varying vec3 n;varying vec3 surface;varying float depth;void main(){vec4 world=model*vec4(position,1.);gl_Position=viewProjection*world;n=normalize(mat3(model)*normal);surface=world.xyz;depth=gl_Position.w;}`;
const fragment=`precision mediump float;uniform vec3 color;uniform float grain;varying vec3 n;varying vec3 surface;varying float depth;void main(){float light=.67+.33*max(dot(normalize(n),normalize(vec3(-.5,1.,.6))),0.);float speck=fract(sin(dot(floor(surface.xz*75.),vec2(12.9898,78.233)))*43758.5453);vec3 shade=color*(light+grain*(speck-.5));float fog=smoothstep(85.,300.,depth);gl_FragColor=vec4(mix(shade,vec3(.725,.851,.89),fog),1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw Error(gl.getShaderInfoLog(s));}return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){throw Error(gl.getProgramInfoLog(program));}gl.useProgram(program);
const loc={p:gl.getAttribLocation(program,'position'),n:gl.getAttribLocation(program,'normal'),m:gl.getUniformLocation(program,'model'),vp:gl.getUniformLocation(program,'viewProjection'),c:gl.getUniformLocation(program,'color'),grain:gl.getUniformLocation(program,'grain')};
gl.enable(gl.DEPTH_TEST);gl.clearColor(.725,.851,.89,1);
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++){for(let r=0;r<4;r++){for(let k=0;k<4;k++){o[c*4+r]+=a[k*4+r]*b[c*4+k];}}}return o;}
function T(x,y,z){const m=I();m[12]=x;m[13]=y;m[14]=z;return m;}
function S(x,y,z){const m=I();m[0]=x;m[5]=y;m[10]=z;return m;}
function RX(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
function RY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
function RZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
function normalize(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l);}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function lookAt(eye,target){const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function perspective(aspect){const f=1/Math.tan(Math.PI/6),near=.1,far=400;return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function mesh(points,normals){const p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);const n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);return{p,n,count:points.length/3};}
function parametric(rows,cols,fn){const p=[],n=[];for(let i=0;i<rows;i++){for(let j=0;j<cols;j++){const corners=[[i/rows,j/cols],[(i+1)/rows,j/cols],[(i+1)/rows,(j+1)/cols],[i/rows,(j+1)/cols]];for(const k of [0,1,2,0,2,3]){const q=fn(...corners[k]);p.push(...q[0]);n.push(...q[1]);}}}return mesh(p,n);}
const sphere=parametric(9,14,(u,v)=>{const a=u*Math.PI,b=v*Math.PI*2,p=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];return[p,p];});
const cylinder=parametric(1,12,(u,v)=>{const a=v*Math.PI*2;return[[Math.cos(a),u-.5,Math.sin(a)],[Math.cos(a),0,Math.sin(a)]];});
function torus(radius,tube){return parametric(24,6,(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI*2,c=Math.cos(b),s=Math.sin(b);return[[tube*s,(radius+tube*c)*Math.cos(a),(radius+tube*c)*Math.sin(a)],[s,c*Math.cos(a),c*Math.sin(a)]];});}
const tire=torus(.61,.065),rim=torus(.51,.018);
const cube=(()=>{const p=[],n=[];for(let axis=0;axis<3;axis++){for(const sign of [-1,1]){const normal=[0,0,0];normal[axis]=sign;const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];for(const k of [0,1,2,0,2,3]){const q=[0,0,0];q[axis]=sign*.5;q[(axis+1)%3]=corners[k][0];q[(axis+2)%3]=corners[k][1];p.push(...q);n.push(...normal);}}}return mesh(p,n);})();
const palette={ink:[.065,.23,.25],crab:[.96,.36,.25],lightCrab:[1,.51,.34],gold:[1,.76,.25],cream:[1,.97,.82],sand:[.94,.82,.58],road:[.98,.91,.72],sea:[.23,.66,.67],green:[.26,.57,.39]};
function drawMesh(shape,m,color,grain=0){gl.uniform1f(loc.grain,grain);gl.bindBuffer(gl.ARRAY_BUFFER,shape.p);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,shape.n);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(loc.m,false,new Float32Array(m));gl.uniform3fv(loc.c,color);gl.drawArrays(gl.TRIANGLES,0,shape.count);}
function blob(root,pos,size,color,rotation=I()){drawMesh(sphere,mul(root,mul(T(...pos),mul(rotation,S(...size)))),color);}
function box(root,pos,size,color,rotation=I()){drawMesh(cube,mul(root,mul(T(...pos),mul(rotation,S(...size)))),color);}
function beam(root,a,b,r,color){const y=normalize(b.map((v,i)=>v-a[i])),x=normalize(cross(Math.abs(y[1])>.95?[1,0,0]:[0,1,0],y)),z=cross(x,y),length=Math.hypot(...b.map((v,i)=>v-a[i]));const m=[x[0]*r,x[1]*r,x[2]*r,0,y[0]*length,y[1]*length,y[2]*length,0,z[0]*r,z[1]*r,z[2]*r,0,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,1];drawMesh(cylinder,mul(root,m),color);}
