"""Chromium smoke tests for the Tauri frontend with a deterministic native IPC stub.
Requires Python playwright and Chromium; this does NOT validate a Windows binary.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

PROJECT = Path(__file__).resolve().parent.parent
HTML = (PROJECT / "web/index.html").read_text(encoding="utf-8").replace(
    '<link rel="stylesheet" href="./style.css">', ""
).replace('<script defer src="./app.js"></script>', "")
CSS = (PROJECT / "web/style.css").read_text(encoding="utf-8")
JS = (PROJECT / "web/app.js").read_text(encoding="utf-8")

MOCK = r"""
window.__db_calls = [];
window.__db_saved = null;
window.__db_window = {
  x:100,y:100,width:1240,height:810,
  async outerPosition(){return {x:this.x,y:this.y}},
  async innerSize(){return {width:this.width,height:this.height}},
  async setSize(v){this.width=v.width;this.height=v.height},
  async setPosition(v){this.x=v.x;this.y=v.y},
  async center(){this.x=400;this.y=200},
  async onResized(fn){this.onResize=fn;return ()=>{}},
  async onMoved(fn){this.onMove=fn;return ()=>{}}
};
window.__TAURI__ = {
 core: {invoke:async (command,args={}) => {
   window.__db_calls.push([command,args]);
   if(command==='load_state')return window.__db_saved;
   if(command==='save_state'){window.__db_saved=args.json;return null}
   if(command==='get_autostart')return false;
   if(command==='backup_now')return 'C:\\DAYBOARD\\backup.json';
   return null;
 }},
 window: {getCurrentWindow:()=>window.__db_window,availableMonitors:async()=>[{position:{x:0,y:0},size:{width:2560,height:1440}}]},
 dpi: {
  PhysicalSize:class{constructor(width,height){this.width=width;this.height=height}},
  LogicalSize:class{constructor(width,height){this.width=width;this.height=height}},
  PhysicalPosition:class{constructor(x,y){this.x=x;this.y=y}}
 }
};
"""

def run():
  errors=[]
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1500,'height':900})
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.set_content(HTML)
    page.add_style_tag(content=CSS)
    page.evaluate(MOCK)
    page.add_script_tag(content=JS)
    page.wait_for_function('window.__db_saved && document.querySelectorAll(".task-card").length >= 5')
    print('PASS native IPC init and SQLite payload contract')
    base_tasks=len(json.loads(page.evaluate('window.__db_saved'))['tasks'])

    page.locator('button[data-action="quick"]').first.click()
    page.locator('#quick-input').fill('DAYBOARD smoke task')
    page.locator('#quick-input').press('Enter')
    page.wait_for_function('(n) => JSON.parse(window.__db_saved).tasks.length === n',arg=base_tasks+1)
    print('PASS creating tasks via native save_state')

    page.locator('.task-card').filter(has_text='DAYBOARD smoke task').click()
    page.locator('[data-field="description"]').fill('QA description, saved in SQLite bridge')
    page.locator('button[data-action="add-check"]').click()
    page.locator('[data-check-text]').last.fill('QA checklist')
    page.locator('button[data-action="save-editor"]').click()
    page.wait_for_function('JSON.parse(window.__db_saved).tasks.some(t=>t.title==="DAYBOARD smoke task" && t.description.includes("QA description") && t.checklist.some(c=>c.text==="QA checklist"))')
    print('PASS editing descriptions and checklists')

    page.locator('button[data-action="page"][data-page="week"]').first.click()
    assert page.locator('.week-day').count()==7
    print('PASS seven-day planner')

    page.locator('button[data-action="toggle-mode"]').first.click()
    page.wait_for_function('JSON.parse(window.__db_saved).settings.mode === "compact"')
    assert page.locator('.widget-root').count()==1
    assert page.evaluate('window.__db_window.width')==390
    print('PASS compact native window resizing')

    page.locator('button[data-action="toggle-mode"]').first.click()
    page.wait_for_function('JSON.parse(window.__db_saved).settings.mode === "full"')
    page.locator('button[data-action="page"][data-page="today"]').first.click()
    assert page.locator('.board-col').count()==4
    print('PASS returning to full Kanban')

    page.locator('.task-card').filter(has_text='DAYBOARD smoke task').locator('button[data-action="complete"]').click()
    page.wait_for_function('JSON.parse(window.__db_saved).tasks.some(t=>t.title==="DAYBOARD smoke task" && t.status==="done" && t.completedAt)')
    page.locator('button[data-action="page"][data-page="history"]').first.click()
    assert page.locator('body').get_by_text('DAYBOARD smoke task').count()>=1
    print('PASS completed-task history')

    calls=[x[0] for x in page.evaluate('window.__db_calls')]
    assert 'set_always_on_top' in calls
    assert 'load_state' in calls
    assert 'save_state' in calls
    assert not errors, errors
    # A corrupt SQLite/native load must not be overwritten by a blank task board.
    failure=browser.new_page(viewport={'width':1000,'height':700})
    failure.set_content(HTML)
    failure.add_style_tag(content=CSS)
    failure.evaluate(MOCK)
    failure.evaluate("window.__TAURI__.core.invoke = async (command,args) => { window.__db_calls.push([command,args]); if(command==='load_state')throw Error('SQLite unavailable'); return null; }")
    failure.add_script_tag(content=JS)
    failure.wait_for_function('document.body.innerText.includes("Ошибка загрузки данных")')
    bad_calls=[c[0] for c in failure.evaluate('window.__db_calls')]
    assert 'save_state' not in bad_calls, 'Failed database load must never overwrite state'
    failure.close()
    print('PASS non-destructive native database failure handling')

    browser.close()
    print('PASS JavaScript runtime: no uncaught errors')

if __name__ == '__main__': run()
