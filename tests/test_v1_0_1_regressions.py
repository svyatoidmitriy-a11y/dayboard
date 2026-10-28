"""DAYBOARD 1.0.1 regression tests in Chromium with a mocked Tauri IPC bridge.
Run: python tests/test_v1_0_1_regressions.py
The real Windows Tauri build is tested by GitHub Actions, not this browser test.
"""
import json
from datetime import date, timedelta
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
from test_ui_native_bridge import HTML,CSS,JS,MOCK


def main():
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-gpu'],**({'executable_path':which('chromium') or which('chromium-browser')} if (which('chromium') or which('chromium-browser')) else {}))
        page=browser.new_page(viewport={'width':1500,'height':900})
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(HTML)
        page.add_style_tag(content=CSS)
        page.evaluate(MOCK)
        page.add_script_tag(content=JS)
        page.wait_for_function('window.__db_saved && document.querySelectorAll(".task-card").length >= 5')
        def saved():return json.loads(page.evaluate('window.__db_saved'))
        def task(title):return next(t for t in saved()['tasks'] if t['title']==title)

        # Ctrl+N continues to work repeatedly, even after returning focus to the board.
        initial=len(saved()['tasks'])
        for n in range(3):
            page.keyboard.press('Control+n')
            page.locator('#quick-input').wait_for()
            page.locator('#quick-input').fill(f'Ctrl N task {n+1}')
            page.keyboard.press('Enter')
            page.wait_for_function('n => JSON.parse(window.__db_saved).tasks.length === n',arg=initial+n+1)
            assert page.locator('#quick-input').count()==0
            page.locator('h1').click()
        assert sum(1 for t in saved()['tasks'] if t['title'].startswith('Ctrl N task'))==3
        print('PASS repeated Ctrl+N / Enter creation and native persistence (3 tasks)')

        # Drag task to a different Kanban status, including a real pointer sequence.
        source=page.locator('.board-col[data-drop-status="planned"] .task-card').filter(has_text='Ctrl N task 1')
        target=page.locator('.board-col[data-drop-status="progress"] .col-head')
        source.drag_to(target,force=True)
        page.wait_for_function('JSON.parse(window.__db_saved).tasks.some(t=>t.title==="Ctrl N task 1" && t.status==="progress")')
        assert task('Ctrl N task 1')['status']=='progress'
        print('PASS HTML5 drag-and-drop between Kanban statuses')

        # Internal column sorting: drop a card above another card and persist position.
        a=page.locator('.board-col[data-drop-status="progress"] .task-card').filter(has_text='Ctrl N task 1')
        b=page.locator('.board-col[data-drop-status="progress"] .task-card').filter(has_text='Подготовить материалы встречи')
        a.drag_to(b,target_position={'x':30,'y':3},force=True)
        page.wait_for_timeout(250)
        titles=page.locator('.board-col[data-drop-status="progress"] .task-title').all_text_contents()
        assert titles.index('Ctrl N task 1')<titles.index('Подготовить материалы встречи'),titles
        print('PASS ordering cards inside one Kanban column')

        # Switch to week view and move task into tomorrow's day.
        page.locator('button[data-action="page"][data-page="week"]').first.click()
        tomorrow=(date.today()+timedelta(days=1)).isoformat()
        source=page.locator('.week-day .task-card').filter(has_text='Ctrl N task 2')
        destination=page.locator(f'.week-day[data-drop-day="{tomorrow}"] .dayhead')
        source.drag_to(destination,force=True)
        page.wait_for_function('(day) => JSON.parse(window.__db_saved).tasks.some(t=>t.title==="Ctrl N task 2" && t.plannedDate===day)',arg=tomorrow)
        assert task('Ctrl N task 2')['plannedDate']==tomorrow
        print('PASS drag and drop between days in weekly planner')

        # Date picker: click the entire date field, invalid manual input should not save.
        page.wait_for_timeout(500)  # Avoid the click emitted at the end of a drag gesture.
        page.locator('.week-day .task-card').filter(has_text='Ctrl N task 2').click()
        page.locator('button[data-action="open-date"][data-field-name="plannedDate"]').click()
        page.locator('.date-popover').wait_for()
        page.locator('#calendar-manual').fill('31.02.2026')
        page.locator('button[data-action="calendar-apply"]').click()
        assert page.locator('.calendar-error').is_visible()
        assert page.locator('.date-popover').count()==1
        page.locator('#calendar-manual').fill('14.11.2026')
        page.locator('#calendar-manual').press('Enter')
        assert page.locator('.date-popover').count()==0
        page.locator('button[data-action="open-date"][data-field-name="plannedDate"]').get_by_text('14 ноября 2026').wait_for()
        print('PASS custom date picker, manual date entry and invalid date validation')

        # Deadline: choose a calendar day and edit the time independently.
        page.locator('button[data-action="open-date"][data-field-name="dueAt"]').click()
        page.locator('#calendar-manual').fill('15.11.2026')
        page.locator('#calendar-time').fill('17:35')
        page.locator('button[data-action="calendar-apply"]').click()
        assert '17:35' in page.locator('[data-field-name="dueAt"]').inner_text()
        # Reminder: pressing row opens picker, clearing removes old value.
        page.locator('button[data-action="open-date"][data-field-name="remindAt"]').click()
        page.locator('#calendar-manual').fill('13.11.2026')
        page.locator('#calendar-time').fill('10:10')
        page.locator('button[data-action="calendar-apply"]').click()
        page.locator('button[data-action="open-date"][data-field-name="remindAt"]').click()
        page.locator('button[data-action="calendar-clear"]').click()
        page.locator('button[data-action="save-editor"]').click()
        page.wait_for_function('JSON.parse(window.__db_saved).tasks.some(t=>t.title==="Ctrl N task 2" && t.plannedDate==="2026-11-14" && t.dueAt && !t.remindAt)')
        target=task('Ctrl N task 2')
        assert target['dueAt'].endswith('Z'),target
        print('PASS date/time picker deadline and clearing reminders with persisted ISO timestamps')

        # Picker screen bounds for compact widget and repeated keyboard shortcut.
        page.locator('button[data-action="toggle-mode"]').first.click()
        page.wait_for_function('JSON.parse(window.__db_saved).settings.mode === "compact"')
        page.keyboard.press('Control+n')
        page.locator('#quick-input').fill('Widget quick task')
        page.keyboard.press('Enter')
        page.wait_for_function('JSON.parse(window.__db_saved).tasks.some(t=>t.title==="Widget quick task")')
        page.set_viewport_size({'width':390,'height':650})
        page.locator('.widget-task').filter(has_text='Widget quick task').click()
        page.locator('[data-field-name="dueAt"]').click()
        page.locator('.date-popover').wait_for()
        rect=page.locator('.date-popover').bounding_box()
        assert 0<=rect['x'] and rect['x']+rect['width']<=390,rect
        assert 0<=rect['y'] and rect['y']+rect['height']<=650,rect
        print('PASS date picker and repeated Ctrl+N in compact widget')

        assert not errors,errors
        print('PASS no uncaught JavaScript errors')
        page.screenshot(path=str(Path(__file__).resolve().parent.parent/'qa/05-date-picker.png'))
        browser.close()

if __name__=='__main__':main()
