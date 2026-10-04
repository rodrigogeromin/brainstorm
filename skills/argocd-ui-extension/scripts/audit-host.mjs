import {mkdir,lstat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function auditHost(version,destination,{fetchSource=fetch}={}){
  if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version))throw new Error('Exact release version required');
  const dest=path.resolve(destination);
  try{await lstat(dest);throw new Error('Destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  const tag=`v${version}`, files=[];
  async function collect(file,optional=false){
    const url=`https://raw.githubusercontent.com/argoproj/argo-cd/${tag}/${file}`;
    const response=await fetchSource(url);
    if(optional&&response.status===404)return false;
    if(!response.ok)throw new Error(`Cannot collect ${url}: HTTP ${response.status}`);
    const content=await response.text();
    files.push({path:file,url,sourceUrl:`https://github.com/argoproj/argo-cd/blob/${tag}/${file}`,sha256:createHash('sha256').update(content).digest('hex'),content});return true;
  }
  for(const file of ['ui/src/app/shared/services/extensions-service.ts','ui/src/app/index.tsx','ui/package.json'])await collect(file);
  let lock=false;for(const file of ['ui/pnpm-lock.yaml','ui/yarn.lock','ui/package-lock.json'])if(await collect(file,true)){lock=true;break;}
  if(!lock)throw new Error('No supported lockfile exists in exact tag');
  const pkg=JSON.parse(files.find(f=>f.path==='ui/package.json').content);
  const report={tag,contractReviewed:false,dependencies:pkg.dependencies,devDependencies:pkg.devDependencies,files:files.map(({content,...metadata})=>metadata)};
  await mkdir(path.dirname(dest),{recursive:true});await mkdir(dest);
  for(const file of files){await mkdir(path.dirname(path.join(dest,file.path)),{recursive:true});await writeFile(path.join(dest,file.path),file.content,{flag:'wx'});}
  await writeFile(path.join(dest,'audit.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))try{const [version,dest,...extra]=process.argv.slice(2);if(!version||!dest||extra.length)throw new Error('Usage: node audit-host.mjs exact-version new-directory');console.log(JSON.stringify(await auditHost(version,dest)));}catch(e){console.error(e.message);process.exitCode=1;}
