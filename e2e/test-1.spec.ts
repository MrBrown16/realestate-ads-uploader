import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.szuperpiac.hu/belepes.php');
  await page.getByPlaceholder('E-mail').click();
  await page.getByPlaceholder('E-mail').click();
  await page.getByPlaceholder('E-mail').click();
  await page.getByPlaceholder('E-mail').click();
  await page.getByPlaceholder('Belépési kód').click();
});