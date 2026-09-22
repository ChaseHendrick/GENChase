'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {numbers,observation,parse:harvestOptions,harvest}=require('./harvest');
const {parse:cliOptions}=require('./cli');
const {redact}=require('./privacy');
test('numeric tokens preserve measured values and literal positions without inventing units',()=>{
 const text='measured -2.30e-4; expected +.5; tolerance 0.001; sigma 2';
 const found=numbers(text);assert.deepEqual(found.map(x=>x.value),[-.00023,.5,.001,2]);
 for(const x of found)assert.equal(text.slice(x.offset,x.offset+x.token.length),x.token);
 assert.deepEqual(numbers('not measured'),[]);assert.deepEqual(numbers('1e999'),[]);
 assert.equal(redact('measured -2.30e-4, expected +.5, tolerance 0.001'), 'measured -2.30e-4, expected +.5, tolerance 0.001');
});
test('only explicit structured witnesses determine agreement, unknown stays unassessed',()=>{
 const data={recipeHash:'#fixture/seed',recipe:{id:'fixture'},statusText:'measured 4',witness:{valid:true,measured:4,expected:4,tol:0}};
 assert.equal(observation('fixture',data).status,'within stated tolerance');
 assert.equal(observation('fixture',{...data,witness:{...data.witness,valid:false}}).status,'witness miss');
 for(const witness of [null,{valid:null},{valid:'true'}])assert.equal(observation('fixture',{...data,witness}).status,'unassessed');
 assert.equal(observation('fixture',data,'runtime failure').status,'runtime failure');
 assert.equal(observation('fixture',null).recipeHash,null);
});
test('headless CLI parsing preserves typed workload and power options without hidden overrides',()=>{
 const value=cliOptions(['--mode','metal','--grid','64','--steps','200','--machine','lab-one','--power','maximum','--allow-battery']).input;
 assert.equal(value.workspace,'contribute');assert.equal(value.grid,64);assert.equal(value.steps,200);assert.equal(value.machineSlug,'lab-one');assert.equal(value.power.pauseOnBattery,false);assert.equal(value.power.thermalPause,true);
 assert.equal(cliOptions(['--mode','witness','--id','reuleaux']).input.workspace,'validate');
 assert.equal(cliOptions(['--mode','maxwell-search']).input.workspace,'contribute');
 assert.equal(cliOptions(['--resume']).resume,true);
 for(const args of [['--resume','--mode','inventory'],['--mode'],['--shell','echo']])assert.throws(()=>cliOptions(args));
});
test('harvest reproduction options include exact module list, label and observation budget',async()=>{
 assert.deepEqual(harvestOptions(['--all','--machine','lab-two','--dwell','450'],['a','b']),{selected:['a','b'],machineSlug:'lab-two',dwellMs:450});
 assert.deepEqual(harvestOptions(['a','--machine','lab-two','--dwell','100'],['a']).selected,['a']);
 for(const args of [['--all','a'],['--all','--all'],['--dwell'],['--shell']])assert.throws(()=>harvestOptions(args,['a']));
 await assert.rejects(harvest({selected:['reuleaux','reuleaux']}),/registered module/);
 await assert.rejects(harvest({selected:['reuleaux'],dwellMs:0}),/100 to 60000/);
});
