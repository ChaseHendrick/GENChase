'use strict';
const { build, telemetry } = require('./native');
const DUTY = { light: .25, balanced: .5, maximum: 1 };
function settings(input = {}) {
 if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!['mode','pauseOnBattery','thermalPause'].includes(k))) throw Error('Invalid power settings.');
 for(const key of ['pauseOnBattery','thermalPause'])if(input[key]!==undefined&&typeof input[key]!=='boolean')throw Error('Power pause options must be booleans.');
 const value={mode:input.mode??'balanced',pauseOnBattery:input.pauseOnBattery!==false,thermalPause:input.thermalPause!==false};
 if(!Object.hasOwn(DUTY,value.mode))throw Error('Choose light, balanced or maximum compute duty.');
 return value;
}
function reason(p, reading, phase) {
 if(p.thermalPause && ['serious','critical','unknown'].includes(reading.thermal))return reading.thermal==='unknown'?'Thermal status unavailable':'Thermal pause: '+reading.thermal;
 if(p.pauseOnBattery && reading.onBattery===true)return 'Paused on battery';
 if(phase>=DUTY[p.mode])return 'Duty-cycle rest';
 return null;
}
class Power {
 constructor(jobs,prefs){this.jobs=jobs;this.prefs=settings(prefs);this.paused=false;this.reading={thermal:'unknown',onBattery:null};this.last=0;
  if(process.platform==='darwin'){try{this.binary=build().binary;}catch(e){this.reading.error=e.message;}}
  else {this.reading.thermal='unsupported';}
 }
 start(){this.timer=setInterval(()=>this.tick(),1000);this.tick();}
 tick(){
  if(!this.jobs.active()||this.jobs.stopping)return;
  if(this.binary && Date.now()-this.last>5000){this.reading=telemetry(this.binary);this.last=Date.now();}
  const why=reason(this.prefs,this.reading,(Date.now()%4000)/4000);
  if(!!why!==this.paused){this.jobs.kill(why?'SIGSTOP':'SIGCONT');this.paused=!!why;}
  this.jobs.current.power={...this.prefs,reading:this.reading,paused:this.paused,reason:why,dutyFraction:DUTY[this.prefs.mode]};
 }
 update(value){this.prefs=settings(value);this.tick();}
 stop(){clearInterval(this.timer);if(this.paused)this.jobs.kill('SIGCONT');this.paused=false;}
}
module.exports={Power,settings,reason,DUTY};
