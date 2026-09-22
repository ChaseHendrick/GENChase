'use strict';
// Independent CPU-field to RGBA reference, evaluated in the browser.
module.exports = async ({id,expected,W,H})=>{
    const e=Studio.auditInstances()[id],s=e.state,img=document.querySelector('#export-img');await img.decode();const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);const rgba=g.getImageData(0,0,w,h).data;
    const toLinear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,toSrgb=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
    const stops=[s.bg,...s.palette].map(hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>toLinear(parseInt(h.slice(i,i+2),16)/255));});
    const lo=Math.min(...expected),hi=Math.max(...expected),native=new Uint8ClampedArray(W*H*4);
    for(let i=0;i<expected.length;i++){let t=(expected[i]-lo)/(hi-lo||1);if(s.view==='log')t=Math.log(1.001+9*Math.max(0,t))/Math.log(10);t=Math.min(1,Math.max(0,t*s.exposure))*(stops.length-1);const k=Math.min(stops.length-2,Math.floor(t)),u=t-k;for(let ch=0;ch<3;ch++)native[4*i+ch]=toSrgb((1-u)*stops[k][ch]+u*stops[k+1][ch]);native[4*i+3]=255;}
    let maxChannelError=0,wrongPixels=0,checked=0,firstMismatch=null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=4*(y*w+x),j=4*(Math.min(H-1,Math.ceil((y+.5)*H/h-1e-10)-1)*W+Math.min(W-1,Math.ceil((x+.5)*W/w-1e-10)-1)),bad=(j+4)%(W*H*4);let wrong=false;for(let ch=0;ch<4;ch++){maxChannelError=Math.max(maxChannelError,Math.abs(rgba[i+ch]-native[j+ch]));if(!firstMismatch&&Math.abs(rgba[i+ch]-native[j+ch])>1)firstMismatch={x,y,ch,actual:rgba[i+ch],expected:native[j+ch],source:j/4,W,H,w,h};if(Math.abs(rgba[i+ch]-native[bad+ch])>1)wrong=true;checked++;}if(wrong)wrongPixels++;}
    if(maxChannelError>1||wrongPixels<100)throw Error(JSON.stringify({maxChannelError,wrongPixels,firstMismatch}));
    return {width:w,height:h,channelsChecked:checked,maxChannelError,shiftedCellFailurePixels:wrongPixels,params:JSON.parse(JSON.stringify(s))};
   };
