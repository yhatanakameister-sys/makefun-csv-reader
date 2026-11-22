import {run} from './solve.js';
import assert from 'node:assert/strict';
const cases=[
 [{text:'a,b\n1,2',header:true},{columns:['a','b'],rows:[['1','2']],errors:[]}],
 [{text:'a,b\n1',header:true},{columns:['a','b'],rows:[['1','']],errors:[{code:'short_row',line:2,row:0,fields:1}]}],
 [{text:'a,b\n1,2,3',header:true},{columns:['a','b'],rows:[['1','2']],errors:[{code:'long_row',line:2,row:0,extra:['3']}]}],
 [{text:'"a,b",c\n"x\r\ny",z',header:false},{columns:null,rows:[['a,b','c'],['x\ny','z']],errors:[]}],
 [{text:'\ufeffx,y\r\n1,2\r\n',header:true},{columns:['x','y'],rows:[['1','2']],errors:[]}],
 [{text:'',header:true},{columns:null,rows:[],errors:[]}],
];
for(const [input,expected] of cases)assert.deepEqual(run(input),expected);
console.log(`${cases.length} local tests passed`);
