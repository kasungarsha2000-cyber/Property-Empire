"""Capture the city at desktop/mobile sizes and exercise the camera controls."""
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out = Path('test-artifacts')
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('EMPIRE_URL', 'http://127.0.0.1:5173'))
    page.wait_for_load_state('networkidle')
    page.wait_for_function('document.fonts.status === "loaded"')
    expect(page.locator('canvas')).to_be_visible()
    expect(page.locator('.context-error')).to_have_count(0)
    page.screenshot(path=str(out / 'graphics-menu-desktop.png'), full_page=True)
    page.get_by_role('button', name='Zoom in', exact=True).click()
    page.get_by_role('button', name='Zoom in', exact=True).click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / 'graphics-city-close.png'), full_page=True)
    page.get_by_role('button', name='Reset camera', exact=True).click()
    page.get_by_role('button', name='Play Solo', exact=True).click()
    page.get_by_label('Bot opponents').select_option('7')
    assert page.get_by_label('Your token').locator('option').count() == 8
    page.get_by_label('Your token').select_option('6')
    page.get_by_role('button', name='Start game', exact=True).click()
    expect(page.get_by_role('button', name='Roll dice', exact=True)).to_be_enabled(timeout=30000)
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / 'graphics-eight-tokens.png'), full_page=True)
    page.get_by_role('button', name='Roll dice', exact=True).click()
    page.wait_for_timeout(1900)
    page.screenshot(path=str(out / 'graphics-game-desktop.png'), full_page=True)
    for width, height in [(390, 844), (375, 812), (844, 390), (768, 1024)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(200)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        expect(page.locator('canvas')).to_be_visible()
        expect(page.locator('.context-error')).to_have_count(0)
        if width == 390:
            page.screenshot(path=str(out / 'graphics-game-mobile.png'), full_page=True)
    assert not errors, errors
    print(json.dumps({'result': 'PASS', 'page_errors': errors, 'screenshots': str(out)}))
    browser.close()
