import puppeteer from 'puppeteer';
const BASE='http://localhost:3093';
const token=(await (await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})})).json()).token;
const b=await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
async function setup(p){await p.goto(BASE,{waitUntil:'domcontentloaded'});await p.evaluate(t=>localStorage.setItem('atlas_token',t),token);await p.goto(BASE,{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,1500));}
let p=await b.newPage();await p.setViewport({width:1440,height:880,deviceScaleFactor:1.5});await setup(p);
const cards=await p.$$('button.group');for(const c of cards){const tx=await p.evaluate(el=>el.textContent,c);if(tx.includes('Иван')){await c.click();break;}}
await new Promise(r=>setTimeout(r,1300));
await p.screenshot({path:'/tmp/lg-desktop.png'});console.log('desktop');await p.close();
p=await b.newPage();await p.setViewport({width:390,height:844,isMobile:true,deviceScaleFactor:2});await setup(p);
await p.screenshot({path:'/tmp/lg-mobile.png'});console.log('mobile');await p.close();
await b.close();
