import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import {GoogleGenAI} from '@google/genai';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app=express();
const PORT=process.env.PORT||3001;
const DATA=path.resolve(process.env.DATA_DIR||'./data');
const UP=path.join(DATA,'uploads'), OUT=path.join(DATA,'results');
await fs.mkdir(UP,{recursive:true}); await fs.mkdir(OUT,{recursive:true});
app.use(cors()); app.use(express.json({limit:'2mb'}));
app.use('/results',express.static(OUT));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const ai=process.env.GEMINI_API_KEY?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;
const s3=process.env.S3_BUCKET?new S3Client({region:process.env.S3_REGION||'auto',endpoint:process.env.S3_ENDPOINT,credentials:process.env.S3_ACCESS_KEY?{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY}:undefined}):null;

const instructions={
 auto:'Restore and enhance this photograph naturally. Reduce noise, improve exposure, contrast, clarity and fine detail. Preserve the original composition, number of people, clothing, objects and identity of every person. Do not beautify or redesign faces.',
 restore:'Carefully restore this old or damaged photograph. Remove scratches, dust, stains, creases and fading where possible. Reconstruct damaged areas conservatively. Preserve the original people, facial identity, clothing, scene and composition. Do not invent decorative details.',
 face:'Restore facial clarity while preserving the exact identity, age, expression, face shape, skin tone and distinctive features of every person. Improve eyes, hair and facial detail naturally. Do not change or beautify the person.',
 upscale:'Improve fine details and apparent clarity of this photograph. Preserve all content and identity. Avoid hallucinated textures, oversharpening and artificial skin.',
 sharp:'Reduce blur, noise, grain and compression artifacts while retaining natural texture and original composition.',
 color:'Colorize this black-and-white photograph realistically. Use historically plausible, restrained colors. Preserve faces, objects, clothing, lighting and composition.',
 repair:'Repair visual defects and improve exposure, white balance, contrast and clarity. Keep all subjects and objects faithful to the source.'
};
app.get('/api/health',(req,res)=>res.json({ok:true,geminiConfigured:!!ai,cloudConfigured:!!s3}));
app.post('/api/process',upload.single('image'),async(req,res)=>{
 try{
  if(!req.file)return res.status(400).json({error:'Tidak ada foto yang diterima.'});
  const mode=req.body.mode||'auto', scale=Math.min(8,Math.max(1,Number(req.body.scale)||2));
  const fmt=['png','jpg','webp'].includes(req.body.format)?req.body.format:'png';
  const quality=Math.min(100,Math.max(60,Number(req.body.quality)||92));
  const id=crypto.randomUUID(); const originalPath=path.join(UP,`${id}-original`);
  await fs.writeFile(originalPath,req.file.buffer);
  let working=req.file.buffer, aiUsed=false, warning='';
  if(ai){
   try{
    const interaction=await ai.interactions.create({
      model:process.env.GEMINI_IMAGE_MODEL||'gemini-nano-banana-2.1',
      input:[
       {type:'image',mime_type:req.file.mimetype,data:req.file.buffer.toString('base64')},
       {type:'text',text:`${instructions[mode]||instructions.auto} Return an edited image, not a textual description. This is a photo restoration task, not a creative reinterpretation.`}
      ],
      response_format:{type:'image',image_size:'2K'}
    });
    if(interaction.output_image?.data){working=Buffer.from(interaction.output_image.data,'base64');aiUsed=true}
    else throw new Error('Gemini tidak mengembalikan output gambar.');
   }catch(e){console.error('Gemini error:',e);warning='Gemini gagal memproses foto. Hasil dibuat dengan pemrosesan gambar dasar; periksa konfigurasi model/API.'}
  } else warning='GEMINI_API_KEY belum diatur. Ini hanya pemrosesan dasar, bukan restorasi AI.';
  const meta=await sharp(working).metadata();
  const width=Math.min(7680,(meta.width||1000)*scale), height=Math.min(7680,(meta.height||1000)*scale);
  let pipeline=sharp(working).resize({width,height,fit:'inside',withoutEnlargement:false,kernel:sharp.kernel.lanczos3});
  if(fmt==='jpg')pipeline=pipeline.jpeg({quality,mozjpeg:true});
  else if(fmt==='webp')pipeline=pipeline.webp({quality});
  else pipeline=pipeline.png({compressionLevel:8});
  const output=await pipeline.toBuffer();
  const outPath=path.join(OUT,`${id}.${fmt}`);
  await fs.writeFile(outPath,output);
  let cloud=false;
  if(s3){try{await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:`ai-photo-studio/${id}.${fmt}`,Body:output,ContentType:`image/${fmt==='jpg'?'jpeg':fmt}`}));cloud=true}catch(e){console.error('S3 upload failed',e);warning+=(warning?' ':'')+'Upload cloud gagal; hasil tersimpan lokal.'}}
  const finalMeta=await sharp(output).metadata();
  res.json({ok:true,id,imageUrl:`/results/${id}.${fmt}`,width:finalMeta.width,height:finalMeta.height,aiUsed,cloud,warning});
 }catch(e){console.error(e);res.status(500).json({error:e.message||'Kesalahan pemrosesan'})}
});
if(process.env.NODE_ENV==='production'){app.use(express.static('dist'));app.get('*',(req,res)=>res.sendFile(path.resolve('dist/index.html')))}
app.listen(PORT,()=>console.log(`AI Photo Studio API: http://localhost:${PORT}`));
