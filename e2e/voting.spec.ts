import { test, expect } from '@playwright/test';

test('Multi-user voting flow', async ({ browser }) => {
  // --- USER A (Moderator) ---
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  
  await pageA.goto('/');
  
  // Create a room
  await pageA.click('button:has-text("Neuen Raum erstellen")');
  await pageA.fill('input[placeholder="Dein Name"]', 'Moderator');
  await pageA.click('button:has-text("Erstellen")');
  
  // Wait for room to be created and get URL
  await expect(pageA).toHaveURL(/room=/);
  const roomUrl = pageA.url();
  
  // Add a story
  await pageA.click('text=Story hinzufügen');
  await pageA.fill('textarea[placeholder*="Beschreibung"]', 'Test Story');
  await pageA.click('button:has-text("Hinzufügen")');
  
  // Select the story for voting
  await pageA.click('button[title="Zur Abstimmung auswählen"]');
  
  // --- USER B (Player) ---
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  
  await pageB.goto(roomUrl);
  
  // Join the room
  await pageB.fill('input[placeholder="Dein Name"]', 'Player 1');
  await pageB.click('button:has-text("Beitreten")');
  
  // Verify both players are visible on Page A
  await expect(pageA.locator('div').filter({ hasText: /^Moderator$/ }).first()).toBeVisible();
  await expect(pageA.locator('div').filter({ hasText: /^Player 1$/ }).first()).toBeVisible();
  
  // --- VOTING ---
  // User A votes
  const card5A = pageA.locator('button').filter({ hasText: /^5$/ });
  await card5A.click();
  
  // Verify User A sees their own vote (one checkmark)
  await expect(pageA.locator('.bg-green-500 >> svg')).toHaveCount(1, { timeout: 10000 });
  
  // User B votes
  const card8B = pageB.locator('button').filter({ hasText: /^8$/ });
  await card8B.click();
  
  // Since there are only 2 players, it should AUTO-REVEAL now.
  // Verify results are visible to both
  // The average should be (5+8)/2 = 6.5
  await expect(pageA.locator('text=6.5').first()).toBeVisible({ timeout: 10000 });
  await expect(pageB.locator('text=6.5').first()).toBeVisible({ timeout: 10000 });
  
  // --- HANDLE APPLY POINTS DIALOG ---
  // Moderator (Page A) sees the dialog, need to skip or close it
  const skipButton = pageA.locator('button:has-text("Überspringen")');
  await expect(skipButton).toBeVisible();
  await skipButton.click();
  
  // --- NEW ROUND ---
  // If it auto-revealed, we still need to start a new round
  const newRoundButton = pageA.locator('button:has-text("Neue Runde starten")');
  await newRoundButton.click();
  
  // Verify state is reset (no results visible)
  await expect(pageA.locator('text=6.5')).not.toBeVisible({ timeout: 10000 });
  
  await contextA.close();
  await contextB.close();
});
