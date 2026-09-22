'use strict';
// Reference reconstruction from independently integrated concentration and chemical fields.
module.exports=async({id,field,chem,W,H,viewIndex,blobURL})=>{
 const e=Studio.auditInstances()[id],s=e.state,img=new Image();img.src=blobURL;await img.decode();
 const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const actual=ctx.getImageData(0,0,w,h).data;
 const clamp=x=>Math.max(0,Math.min(1,x)),linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,srgb=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
 const hex=h=>{h=h.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);},bg=hex(s.bg),stops=(viewIndex===5?[...s.palette,s.palette[0]]:[s.bg,...s.palette]).map(x=>hex(x).map(linear)),lut=new Uint8ClampedArray(768);
 for(let i=0;i<256;i++){const v=i/255*(stops.length-1),k=Math.min(stops.length-2,Math.floor(v)),a=v-k;for(let ch=0;ch<3;ch++)lut[3*i+ch]=255*srgb((1-a)*stops[k][ch]+a*stops[k+1][ch]);}
 const wrap=(x,N)=>s.bc==='noflux'?Math.max(0,Math.min(N-1,x)):(x+N)%N;
 const weights=t=>[-t*(1-t)**2/2,1-2.5*t*t+1.5*t*t*t,t/2+2*t*t-1.5*t*t*t,-t*t*(1-t)/2];
 const xs=Array.from({length:w},(_,x)=>{const q=(x+.5)*W/w-.5,b=Math.floor(q);return{b,weights:weights(q-b),cell:Math.floor((x+.5)*W/w)};});
 let maxChannelError=0,sum=0,wrongPixels=0,channels=0,firstMismatch=null;
 const light=[Math.cos(s.lightAng*Math.PI/180),Math.sin(s.lightAng*Math.PI/180),.85],ln=Math.hypot(...light);
 for(let y=0;y<h;y++){
  const q=(h-y-.5)*H/h-.5,by=Math.floor(q),wy=weights(q-by),cy=Math.floor((h-y-.5)*H/h);
  for(let x=0;x<w;x++){
   const ax=xs[x],cx=ax.cell,at=(dx,dy)=>field[wrap(cy+dy,H)*W+wrap(cx+dx,W)];let u=0;
   if(viewIndex<2)for(let j=0;j<4;j++)for(let i=0;i<4;i++)u+=field[wrap(by+j-1,H)*W+wrap(ax.b+i-1,W)]*wy[j]*ax.weights[i];
   const gx=(at(1,0)-at(-1,0))/2,gy=(at(0,1)-at(0,-1))/2;let t;
   if(viewIndex===0)t=(u-s.lo)/(s.hi-s.lo);else if(viewIndex===1)t=Math.abs(u);else if(viewIndex===2)t=Math.hypot(gx,gy)*2.4;
   else if(viewIndex===3){const n=[-gx*s.bump,-gy*s.bump,1];t=Math.max(0,(n[0]*light[0]+n[1]*light[1]+n[2]*light[2])/(Math.hypot(...n)*ln))**1.15;}
   else if(viewIndex===4)t=.5+.5*Math.tanh(chem[cy*W+cx]*.85);
   else {t=Math.atan2(gy,gx)/(2*Math.PI)+1;t-=Math.floor(t);}
   t=clamp(t);const tex=t*256-.5,l=Math.floor(tex),f=tex-l,ia=Math.max(0,Math.min(255,l)),ib=Math.max(0,Math.min(255,l+1)),o=4*(y*w+x);let wrong=false;
   for(let ch=0;ch<3;ch++){
    let col=((1-f)*lut[3*ia+ch]+f*lut[3*ib+ch])/255;
    if(viewIndex>=2){const q=clamp(Math.hypot(gx,gy)/.001),a=viewIndex===5?q*q*(3-2*q):.15+.85*t;col=(1-a)*bg[ch]+a*col;}
    const predicted=Math.round(255*clamp((Math.pow(clamp(col),s.gamma)*s.exposure-.5)*s.contrast+.5)),d=Math.abs(actual[o+ch]-predicted);
    maxChannelError=Math.max(maxChannelError,d);sum+=d;channels++;if(d>2&&!firstMismatch)firstMismatch={x,y,ch,actual:actual[o+ch],predicted,t,gx,gy};
    if(Math.abs(actual[o+ch]-actual[4*(y*w+(x+Math.ceil(w/W))%w)+ch])>2)wrong=true;
   }
   if(actual[o+3]!==255)throw Error('Nonopaque print');if(wrong)wrongPixels++;
  }
 }
 if(maxChannelError>2||wrongPixels<100)throw Error(JSON.stringify({id,view:s.view,maxChannelError,meanChannelError:sum/channels,wrongPixels,firstMismatch}));
 return{width:w,height:h,maxChannelError,meanChannelError:sum/channels,channelsChecked:channels,shiftedPrintFailurePixels:wrongPixels};
};
