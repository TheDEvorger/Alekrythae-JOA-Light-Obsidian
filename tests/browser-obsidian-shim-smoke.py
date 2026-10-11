#!/usr/bin/env python3
"""Chromium DOM acceptance smoke against bundled Obsidian plugin with a browser-only API shim.
This is NOT the real Obsidian desktop app and is NOT a Windows acceptance test.
Requires Python playwright + installed Chromium; run: python tests/browser-obsidian-shim-smoke.py
"""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHIM = r'''
window.__reportedErrors=[];
window.addEventListener('error', e => window.__reportedErrors.push(e.message));
window.addEventListener('unhandledrejection', e => window.__reportedErrors.push(String(e.reason)));
const contents = new Map();
const emptyBuffer = () => new Uint8Array(0).buffer;
const adapter = {
 exists:async p=>contents.has(p) || (p.startsWith('.obsidian/plugins/joa-frp-writer/audio/MV') && p.endsWith('.mp3') && !!window.__audioFixture),
 mkdir:async p=>{contents.set(p,null);},
 readBinary:async p=> {if(p.includes('/audio/MV') && window.__audioFixture)return window.__audioFixture; if(!contents.has(p))throw Error('missing '+p);return contents.get(p);},
 writeBinary:async(p,v)=>{contents.set(p,v.slice(0));},
 stat:async p=> (p.includes('/audio/MV') && window.__audioFixture)?{size:window.__audioFixture.byteLength}:(contents.has(p)?{size:contents.get(p)?.byteLength??0}:null),
 rename:async(s,d)=>{if(contents.has(d))throw Error('Windows destination already exists'); if(!contents.has(s))throw Error('not found '+s);contents.set(d,contents.get(s));contents.delete(s);},
 remove:async p=>contents.delete(p),
};
const note = { path:'Sample.md',extension:'md' };
const editor = { content:'', cursor:{line:0,ch:0},
 getCursor(){return {...this.cursor}}, setCursor(p){this.cursor={...p}},
 lastLine(){return this.content.split('\n').length-1}, getLine(n){return this.content.split('\n')[n]??''},
 replaceRange(s,from,to){const ls=this.content.split('\n');const prefix=ls.slice(0,from.line).join('\n')+(from.line?'\n':'')+ls[from.line].slice(0,from.ch); const dest=to??from; const suffix=ls[dest.line].slice(dest.ch)+(dest.line<ls.length-1?'\n'+ls.slice(dest.line+1).join('\n'):'');this.content=prefix+s+suffix;},
 focus(){}, scrollIntoView(){}
};
class MarkdownView{}
const workspace = { containerEl:document.querySelector('.workspace'),on(name,handler){return {name,handler}},onLayoutReady(cb){cb()},getActiveFile(){return note}, getActiveViewOfType(klass){return klass===MarkdownView?{editor}:null}};
const app = {vault:{adapter,cachedRead:async()=>editor.content,on:()=>({})}, workspace, metadataCache:{}, fileManager:{}};
class Plugin {
 constructor(){this.app=app;this.commands=[];this.settings=null;}
 addCommand(c){this.commands.push(c)}
 registerEvent(e){}
 registerMarkdownPostProcessor(fn){}
 async loadData(){return this.settings}
 async saveData(data){this.settings=structuredClone(data)}
}
class Modal {
 constructor(app){this.app=app;this.modalEl=document.createElement('div');this.modalEl.className='modal-container';this.contentEl=document.createElement('div');this.contentEl.className='modal-content';this.modalEl.appendChild(this.contentEl);}
 open(){document.body.append(this.modalEl);this.onOpen()}
 close(){this.onClose();this.modalEl.remove()}
}
class Notice {constructor(msg){window.__notices.push(msg)}}
window.__notices=[];
window.Audio = class {constructor(){this.paused=false}play(){return Promise.resolve()}pause(){this.paused=true}addEventListener(){}};
window.__mock={contents,adapter,editor,app};
window.require=(id)=>{if(id==='obsidian')return {Plugin, Modal, Notice, MarkdownView};throw Error('Unexpected native import: '+id)};
window.module={exports:{}};window.exports=window.module.exports;
'''

def check():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width':1366,'height':900}, device_scale_factor=1)
        page.goto('about:blank')
        page.set_content('<main class="workspace"><div class="markdown-view">Sample.md</div></main>')
        page.add_style_tag(content=(ROOT/'styles.css').read_text(encoding='utf-8'))
        page.add_script_tag(content=SHIM)
        # Feed ACTUAL bundled image/audio bytes through the test-vault API shim.
        # The same genuine PNG/WebP/MP3 header checks run as in the plugin.
        assets={
            '.obsidian/plugins/joa-frp-writer/assets/anlati-panel.png': ROOT/'assets/anlati-panel.png',
            '.obsidian/plugins/joa-frp-writer/background-images/default.webp': ROOT/'background-images/default.webp',
            '__audioFixture': ROOT/'audio/MV1.mp3',
        }
        encoded={name:base64.b64encode(file.read_bytes()).decode('ascii') for name,file in assets.items()}
        page.evaluate('''(assets)=>{for(const [path,b64] of Object.entries(assets)){const binary=atob(b64);const data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);if(path==='__audioFixture')window.__audioFixture=data.buffer;else window.__mock.contents.set(path,data.buffer)}}''',encoded)
        page.add_script_tag(content=(ROOT/'main.js').read_text(encoding='utf-8'))
        plugin_loaded=page.evaluate('''async()=>{window.__plugin=new window.module.exports();await window.__plugin.onload();return window.__plugin.commands.map(x=>x.id)}''')
        assert 'open-meggy-scene-writer' in plugin_loaded, plugin_loaded
        page.evaluate("window.__plugin.commands.find(x=>x.id==='open-meggy-scene-writer').callback()")
        page.wait_for_selector('.joa-studio-shell', timeout=12000)
        page.wait_for_timeout(250)
        assert page.locator('.joa-dialogue-input').count()==1
        assert page.locator('.joa-visual-blur').count()==2
        assert page.locator('.joa-visual-blur-story').count()==1
        assert page.locator('.joa-story-backdrop').count()==1
        # Minimal presentation check with real generated CSS loaded in Chromium.
        rect = page.locator('.joa-studio-shell').bounding_box()
        assert rect and rect['width'] > 450 and rect['height'] > 300, rect
        assert page.locator('.joa-mist-slider').count()==2
        assert page.locator('.joa-mist-jewel').count()==2
        assert page.locator('.joa-dialogue-input').evaluate('(el) => getComputedStyle(el).display')!='none'
        assert page.locator('.joa-studio-shell').evaluate('(el)=>getComputedStyle(el).getPropertyValue("--joa-story-blur").trim()').endswith('px')
        assert page.locator('.joa-writing-paper .joa-dialog-backdrop').count()==0
        page.locator('.joa-dialogue-input').fill('A moonlit night in the woods.')
        page.get_by_role('button',name='Onayla ve nota işle').click()
        page.wait_for_timeout(350)
        result = page.evaluate('window.__mock.editor.content')
        assert 'A moonlit night in the woods.' in result, result[:250]
        assert page.locator('.joa-studio-modal').count()==0, 'Meggy confirmation should close the scene writer'
        page.evaluate("window.__plugin.commands.find(x=>x.id==='open-meggy-scene-writer').callback()")
        page.wait_for_selector('.joa-studio-shell')
        page.get_by_role('button', name='Çanta').click()
        page.wait_for_timeout(250)
        assert page.locator('.joa-panel-root').count()==1
        # Click Mevcudat and ensure the view changes without an uncaught rejection.
        page.get_by_role('button', name='Mevcudat').click()
        page.wait_for_timeout(250)
        page.keyboard.press('Escape')
        page.wait_for_timeout(150)
        assert page.locator('.joa-studio-modal').count()==0
        assert not page.evaluate('window.__notices'), 'bundled media must load in simulation'
        return {'commands':len(plugin_loaded),'markdown_inserted':len(result),'notices':page.evaluate('window.__notices'),'errors':page.evaluate('window.__reportedErrors')}

if __name__=='__main__':
    data=check()
    print('CHROMIUM_SHIM_SMOKE',data)
    assert not data['errors'],data['errors']
