import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
// Managed Chromium disables non-proxied UDP. Exercise the real application
// protocol with a local, deterministic transport; public WebRTC is a separate check.
async function localSignal(page){await page.route('**/node_modules/.vite/deps/peerjs.js*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(new URL('../fixtures/peer.js',import.meta.url),'utf8')}));}
test('responsive lobby, rules, two-browser game protocol, full room rejection and rematch',async({browser})=>{
 const context=await browser.newContext({reducedMotion:'reduce'});const a=await context.newPage(), b=await context.newPage(),c=await context.newPage();
 for(const p of [a,b,c])await localSignal(p);
 const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 await a.goto('/');await expect(a.getByRole('heading',{name:'Два мышонка. Одна колода. Кто хитрее?'})).toBeVisible();
 await a.setViewportSize({width:390,height:844});expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await a.screenshot({path:'test-results/lobby-mobile.png',fullPage:true});
 await a.getByRole('button',{name:'Как играть'}).click();await expect(a.locator('dialog')).toBeVisible();await a.getByRole('button',{name:'Закрыть',exact:true}).click();
 await a.setViewportSize({width:1440,height:1000});await a.screenshot({path:'test-results/lobby-desktop.png',fullPage:true});
 await a.locator('#nick').fill('Мышь <сыр>');await a.locator('#password').fill('secret-cheese-123');await a.locator('#join').click();await expect(a.locator('#connection-status')).toContainText('Норка открыта');
 await b.goto('/');await b.locator('#nick').fill('Мышка');await b.locator('[data-girl="true"]').click();await b.locator('#password').fill('secret-cheese-123');await b.locator('#join').click();
 await expect(a.locator('.game')).toBeVisible({timeout:10000});await expect(b.locator('.game')).toBeVisible();await expect(a.locator('.my-hand .playing-card')).toHaveCount(6);await expect(b.locator('.my-hand .playing-card')).toHaveCount(6);await expect(b.locator('.opponent strong')).toHaveText('Мышь <сыр>');
 await c.goto('/');await c.locator('#nick').fill('Третий');await c.locator('#password').fill('secret-cheese-123');await c.locator('#join').click();await expect(c.locator('#connection-status')).toContainText('уже двое');
 const attack=await a.locator('#finish').count()?a:b;const defense=attack===a?b:a;
 await attack.locator('.my-hand [data-card]').first().click();await expect(defense.locator('.table-center .card-pair')).toHaveCount(1);
 await defense.locator('#take').click();await expect(attack.locator('#finish')).toHaveText('Завершить ход →');await attack.locator('#finish').click();await expect(defense.locator('.my-hand .playing-card')).toHaveCount(7);await expect(a.locator('.table-label')).toContainText('ХОД 2');await expect(b.locator('.table-label')).toContainText('ХОД 2');
 await a.screenshot({path:'test-results/game-desktop.png',fullPage:true});await b.setViewportSize({width:390,height:844});expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();for(const width of [320,390,430]){await b.setViewportSize({width,height:844});expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(b.locator('.game-actions')).toHaveCSS('position','fixed');expect(await b.locator('.game-actions button').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);}await b.setViewportSize({width:390,height:844});await b.screenshot({path:'test-results/game-mobile.png',fullPage:true});await b.setViewportSize({width:1200,height:1000});
 // Complete a game through the UI: attack one card, cover when possible, otherwise take.
 const ranks=['6','7','8','9','10','В','Д','К','Т'];
 for(let turn=0;turn<1000;turn++){
  if(await a.locator('#rematch').count())break;
  if(turn%50===0)console.log('UI round',turn);
  const at=await a.locator('#finish').count()?a:b,df=at===a?b:a;
  const choices=at.locator('.my-hand [data-card]');const chosen=choices.nth(Math.floor(Math.random()*await choices.count()));const id=await chosen.getAttribute('data-card');
  await chosen.dispatchEvent('click');await expect(df.locator('.card-pair')).toHaveCount(1);
  const trump=(await df.locator('.deck>span').textContent()).trim().slice(-1);
  const ids=await df.locator('.my-hand [data-card]').evaluateAll(els=>els.map(e=>e.dataset.card));
  const cover=ids.find(c=>(c[0]===id[0]?ranks.indexOf(c.slice(1))>ranks.indexOf(id.slice(1)):c[0]===trump&&id[0]!==trump));
  if(cover){await df.locator(`[data-card="${cover}"]`).dispatchEvent('click');await expect(at.locator('#finish')).toBeEnabled();}else{await df.locator('#take').dispatchEvent('click');await expect(at.locator('#finish')).toHaveText('Завершить ход →');}
  await at.locator('#finish').dispatchEvent('click');await expect(df.locator('.card-pair')).toHaveCount(0);
 }
 await expect(a.locator('#rematch')).toBeVisible();await expect(b.locator('#rematch')).toBeVisible();await b.locator('#rematch').click();await expect(a.locator('.my-hand .playing-card')).toHaveCount(6);await expect(b.locator('.my-hand .playing-card')).toHaveCount(6);expect(errors).toEqual([]);
 await context.close();
});
