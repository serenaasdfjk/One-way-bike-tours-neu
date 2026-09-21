"""End-to-end tests for the static app; no web server required."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / 'index.html').as_uri()
OUTPUT = Path(os.environ.get('ONEWAY_TEST_OUTPUT', '/tmp/oneway-test-results'))
OUTPUT.mkdir(parents=True, exist_ok=True)
CHROME = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')


def run():
    with sync_playwright() as p:
        options = {'headless': True}
        if CHROME.exists():
            options['executable_path'] = str(CHROME)
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=1)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.evaluate('document.fonts.ready')
        expect(page.get_by_role('heading', name='One way bike tours')).to_be_visible()
        page.screenshot(path=str(OUTPUT / '01-welcome.png'), full_page=True)
        page.get_by_role('button', name='Help', exact=True).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).not_to_be_visible()

        page.get_by_role('link', name='Find your adventure', exact=True).click()
        page.get_by_label('I prefer gravel roads', exact=True).check()
        page.get_by_role('button', name='Continue', exact=True).click()
        expect(page.get_by_role('heading', name='Berlin – Copenhagen')).to_be_visible()
        page.get_by_role('button', name='Next route').click()
        expect(page.get_by_role('heading', name='Oslo – Copenhagen')).to_be_visible()
        page.get_by_role('button', name='Next route').click()
        expect(page.get_by_role('heading', name='Gothenburg – Copenhagen')).to_be_visible()
        page.get_by_role('button', name='Next route').click()
        page.screenshot(path=str(OUTPUT / '02-routes.png'), full_page=True)
        page.get_by_role('link', name='Choose Berlin – Copenhagen').click()
        page.get_by_role('button', name='Later pickup time').click()
        expect(page.locator('#time-output')).to_have_text('14:00')
        page.get_by_role('button', name='Next month').click()
        available = page.locator('.day:not(:disabled)')
        available.nth(3).click()
        available.nth(7).click()
        expect(page.locator('.date-status')).to_contain_text('4 days')
        expect(page.locator('.day.selected')).to_have_count(2)
        expect(page.locator('.day.in-range')).to_have_count(3)
        page.screenshot(path=str(OUTPUT / '03-calendar.png'), full_page=True)
        page.get_by_role('button', name='Continue', exact=True).click()
        for option in ['4 days or longer', '30–60 km', 'Some luggage on the bike', 'Alone']:
            page.get_by_label(option, exact=True).check()
            page.get_by_role('button', name='Continue', exact=True).click()
        expect(page.get_by_role('heading', name='Gravel Bike', exact=True)).to_be_visible()
        page.screenshot(path=str(OUTPUT / '04-bikes.png'), full_page=True)
        page.get_by_role('button', name='Previous bike').click()
        page.get_by_role('link', name='Choose Touring Bike').click()
        page.get_by_label('S', exact=True).check()
        page.get_by_role('button', name='size guide').click()
        expect(page.get_by_role('dialog')).to_contain_text('155–170 cm')
        page.keyboard.press('Escape')
        page.get_by_label('Helmet', exact=True).check()
        page.get_by_role('link', name='Continue', exact=True).click()
        expect(page.locator('.total')).to_contain_text('1,340 kr')
        expect(page.locator('#main')).to_contain_text('Size S · 4 days')
        page.get_by_role('link', name='Continue with personal information').click()
        page.get_by_role('button', name='Continue with extras and cover').click()
        expect(page).to_have_url(URL + '#details')
        values = {'firstName': 'Alex', 'lastName': 'Morgan', 'email': 'alex@example.com', 'phone': '+45 12 34 56 78', 'address': 'Nørrebrogade 24', 'city': 'Copenhagen', 'country': 'Denmark'}
        for name, value in values.items():
            page.locator(f'[name="{name}"]').fill(value)
        page.get_by_role('button', name='Continue with extras and cover').click()
        page.get_by_label('Rear pannier', exact=False).check()
        expect(page.locator('[data-total]')).to_have_text('1,415 kr')
        page.get_by_label('Yes, protect it').check()
        page.screenshot(path=str(OUTPUT / '05-extras.png'), full_page=True)
        page.get_by_role('link', name='Continue with payment').click()
        page.get_by_label('Card', exact=True).check()
        expect(page.locator('.payment-card-title h2')).to_have_text('Card')
        expect(page.locator('.payment-line.total')).to_contain_text('1,415 kr')
        page.get_by_role('button', name='Complete demo booking').click()
        expect(page.get_by_role('heading', name="You're ready to ride, Alex.")).to_be_visible()
        expect(page.locator('#main')).to_contain_text('not a reservation')
        with page.expect_download() as info:
            page.get_by_role('button', name='Download your itinerary').click()
        download = info.value
        download.save_as(str(OUTPUT / download.suggested_filename))
        itinerary = (OUTPUT / download.suggested_filename).read_text()
        assert '1,415 kr' in itinerary and 'Pickup: 14:00' in itinerary
        assert 'Bike protection: Included' in itinerary
        page.screenshot(path=str(OUTPUT / '06-confirmation.png'), full_page=True)

        stored = page.evaluate('sessionStorage.getItem("oneway-tour")')
        assert 'alex@example.com' not in stored and 'Morgan' not in stored
        page.reload()
        expect(page).to_have_url(URL + '#payment')
        expect(page.locator('[data-total]')).to_have_text('1,415 kr')
        page.get_by_role('button', name='Complete demo booking').click()
        expect(page.get_by_role('dialog')).to_contain_text('still missing')
        page.get_by_role('link', name='Go to your details').click()
        expect(page.locator('[name="firstName"]')).to_have_value('')

        # Every view must fit narrow, mobile and desktop screens with all assets present.
        screens = ['welcome', 'login', 'register', 'terrain', 'routes', 'date', 'duration', 'distance', 'luggage', 'company', 'bikes', 'bike', 'basket', 'details', 'extras', 'payment']
        for width in [320, 393, 768, 1024, 1440, 1920]:
            page.set_viewport_size({'width': width, 'height': 900 if width > 600 else 852})
            for screen in screens:
                page.goto(URL + '#' + screen)
                page.wait_for_function('Array.from(document.images).every(i => i.complete)')
                assert page.evaluate('document.querySelector(".app").getBoundingClientRect().width >= innerWidth * 0.95'), (width, screen, 'page constrained to phone width')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, screen, 'horizontal overflow')
                broken = page.evaluate('Array.from(document.images).filter(i => !i.naturalWidth).map(i => i.src)')
                assert not broken, (screen, broken)
            if width == 1440:
                page.goto(URL)
                page.screenshot(path=str(OUTPUT / '07-desktop.png'), full_page=True)

        # Credentials are a local demo only, with visible feedback and functional validation.
        page.goto(URL + '#register')
        page.get_by_label('Name', exact=True).fill('Demo User')
        page.get_by_label('Email', exact=True).fill('demo@example.com')
        page.get_by_label('Password', exact=True).fill('demo-only-password')
        page.get_by_role('button', name='Show', exact=True).click()
        expect(page.locator('#auth-password')).to_have_attribute('type', 'text')
        page.get_by_role('button', name='Register', exact=True).click()
        expect(page).to_have_url(URL + '#terrain')
        assert 'demo-only-password' not in page.evaluate('JSON.stringify(sessionStorage)')
        page.get_by_label('Add Your Own Response', exact=True).check()
        page.get_by_role('button', name='Continue', exact=True).click()
        expect(page).to_have_url(URL + '#terrain')
        page.get_by_label('Your own response', exact=True).fill('Coastal paths')
        page.get_by_role('button', name='Continue', exact=True).click()
        expect(page).to_have_url(URL + '#routes')
        page.go_back()
        expect(page.get_by_label('Your own response', exact=True)).to_have_value('Coastal paths')
        assert not errors, errors
        browser.close()
        print('PASS: full booking, totals, date range, bike recommendation, forms, persistence, demo guards, download, 96 responsive views, and no JavaScript errors.')
        print(f'Screenshots: {OUTPUT}')


if __name__ == '__main__':
    run()
