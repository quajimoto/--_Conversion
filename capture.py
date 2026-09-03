import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use mobile viewport for realistic mobile look
        context = await browser.new_context(
            viewport={'width': 375, 'height': 812},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()
        
        # 1. Login page
        await page.goto("http://localhost:5173/")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="login.png")
        
        # 2. Login as admin
        await page.select_option('select.input-field', 'admin')
        await page.click('button[type="submit"]')
        
        # 3. Evaluation Form
        await page.wait_for_timeout(2000)
        await page.screenshot(path="eval.png")
        
        # 4. Admin Dashboard
        # In EvaluationForm, the admin button is the first button in the header right side, but let's just click by evaluating JS
        await page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const adminBtn = btns.find(b => b.textContent.includes('ADMIN') || b.textContent.includes('관리자') || b.getAttribute('style')?.includes('var(--primary)'));
            if(adminBtn) adminBtn.click();
        }""")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="admin.png", full_page=True)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
