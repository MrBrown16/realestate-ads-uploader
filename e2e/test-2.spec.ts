import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.locator('body').click();
  await page.getByLabel('Beleegyezés', { exact: true }).click();
  await page.getByPlaceholder('E-mail').click();
  await page.getByPlaceholder('E-mail').fill('moraingatlan@gmail.com ');
  await page.getByPlaceholder('Belépési kód').click();
  await page.getByPlaceholder('Belépési kód').fill('2wsx');
  await page.getByRole('button', { name: 'Belépek' }).click();
});