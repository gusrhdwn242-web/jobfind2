'use strict';
const {fetchAndParse}=require('../lib/extract.cjs');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='POST')return res.status(405).json({message:'POST 요청만 지원합니다.'});
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({message:'요청 형식이 잘못됐어요.'})}}
 if(!body||typeof body.url!=='string'||body.url.length>2200)return res.status(400).json({message:'공고 링크를 입력해 주세요.'});
 try{return res.status(200).json(await fetchAndParse(body.url))}
 catch(e){return res.status(422).json({message:String(e.message||'원본 공고 읽기 실패').slice(0,320)})}
};
