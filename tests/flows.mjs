import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173'
const SHOTS = '/workspace/pawgress-shots'
const results = []

function rec(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function shot(page, name) {
  await mkdir(SHOTS, { recursive: true })
  const file = path.join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log('SHOT', file)
}

async function wipe(page) {
  await page.goto(BASE)
  await page.evaluate(async () => {
    sessionStorage.clear()
    localStorage.clear()
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('pawgress-demo')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.reload()
  await page.getByTestId('role-staff').waitFor()
}

async function asStaff(page, id) {
  if (await page.getByTestId('role-staff').count()) {
    await page.getByTestId('role-staff').click()
  } else if (await page.getByLabel('Account menu').count()) {
    await page.getByLabel('Account menu').first().click()
    await page.locator('.menu').getByRole('button', { name: 'Switch user' }).click()
    await page.getByTestId('role-staff').click()
  } else {
    await page.goto(BASE)
    await page.getByTestId('role-staff').click()
  }
  await page.getByTestId(`staff-${id}`).click()
  await page.getByText('Patients Today').waitFor()
}

async function asOwner(page, id) {
  if (await page.getByTestId('role-owner').count()) {
    await page.getByTestId('role-owner').click()
  } else if (await page.getByLabel('Account menu').count()) {
    await page.getByLabel('Account menu').first().click()
    await page.locator('.menu').getByRole('button', { name: 'Switch user' }).click()
    await page.getByTestId('role-owner').click()
  } else {
    await page.goto(BASE)
    await page.getByTestId('role-owner').click()
  }
  await page.getByTestId(`owner-${id}`).click()
  await page.getByText('Visit Timeline').waitFor()
}

async function openPatient(page, name) {
  if (await page.getByText('Patients Today').count() === 0) {
    await page.getByRole('button', { name: 'Patients' }).click()
    if (await page.getByLabel('Back').count()) {
      await page.getByLabel('Back').click()
    }
  }
  await page.getByText('Patients Today').waitFor()
  await page.locator('article').filter({ hasText: name }).click()
  await page.getByText('Visit Timeline').waitFor()
}

async function countUpdates(page, pred) {
  return page.evaluate(async (p) => {
    const dbp = indexedDB.open('pawgress-demo', 1)
    return await new Promise((resolve) => {
      dbp.onsuccess = () => {
        const tx = dbp.result.transaction('kv')
        const q = tx.objectStore('kv').get('workspace:pawgress-demo')
        q.onsuccess = () => {
          const ups = q.result?.updates ?? []
          resolve(ups.filter((u) => {
            if (p.patientId && u.patientId !== p.patientId) return false
            if (p.status && u.status !== p.status) return false
            return true
          }).length)
        }
        q.onerror = () => resolve(-1)
      }
      dbp.onerror = () => resolve(-1)
    })
  }, pred)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
const page = await context.newPage()
page.setDefaultTimeout(12000)

try {
  await wipe(page)
  await shot(page, '01-welcome')

  await asStaff(page, 'sarah')
  const names = ['Buddy', 'Luna', 'Max', 'Bella', 'Charlie', 'Daisy']
  const missing = []
  for (const n of names) {
    if (!(await page.getByRole('heading', { name: n }).count())) missing.push(n)
  }
  rec('staff dashboard shows 6 patients', missing.length === 0, missing.join(','))
  rec('status pills visible', (await page.getByText('In Recovery').count()) > 0)
  await shot(page, '02-staff-dashboard')

  // Send update to Buddy
  await page.locator('article').filter({ hasText: 'Buddy' }).getByRole('button', { name: '+ Send Update' }).click()
  await page.getByText('Choose Update').waitFor()
  await page.getByRole('button', { name: 'Eating / Drinking' }).click()
  await shot(page, '03-send-update')
  await page.getByRole('button', { name: 'After visit' }).click({ force: true })
  await page.locator('.photo-preview img').waitFor()
  const sendBtn = page.getByTestId('send-update')
  await sendBtn.scrollIntoViewIfNeeded()
  rec('send disabled before confirm', await sendBtn.isDisabled())
  await page.getByText('I confirm this update and photo').click()
  rec('send enabled after confirm', await sendBtn.isEnabled())
  await sendBtn.evaluate((el) => { el.click(); el.click(); })
  await page.getByText('Update saved and sent to owner').waitFor({ timeout: 5000 })
  rec('toast after send', true)
  await page.waitForTimeout(300)
  const eating = await countUpdates(page, { patientId: 'buddy', status: 'Eating / Drinking' })
  rec('double-tap send creates one update', eating === 1, `count=${eating}`)

  // Photo file input on Luna
  await page.getByLabel('Back').click()
  await page.getByText('Patients Today').waitFor()
  await page.locator('article').filter({ hasText: 'Luna' }).getByRole('button', { name: '+ Send Update' }).click()
  await page.locator('input[type="file"]:not([capture])').setInputFiles('/tmp/pawgress-photo.jpg')
  await page.locator('.photo-preview img').waitFor({ timeout: 8000 })
  rec('photo attach works with file input', true)
  await page.getByText('I confirm this update and photo').click()
  await page.getByTestId('send-update').click()
  await page.getByText('Update saved and sent to owner').waitFor()

  // Second staff
  const page2 = await context.newPage()
  await page2.goto(BASE)
  await asStaff(page2, 'jessica')
  await page2.getByRole('button', { name: 'Updates' }).click()
  await page2.getByText('Eating / Drinking').first().waitFor({ timeout: 8000 })
  rec('second staff user sees the update', (await page2.getByText('Sent by Sarah').count()) > 0)
  await page2.close()

  // Owner Jamie
  await asOwner(page, 'jamie')
  rec('owner sees new update', (await page.getByText('Eating / Drinking').count()) > 0)
  rec('owner sees photo on dashboard', (await page.locator('.update-photo, .status-hero img').count()) > 0)
  const jamieText = await page.locator('.scroll').innerText()
  rec("owner can't see other owner's pets", !jamieText.includes('Luna'))
  await shot(page, '04-owner-dashboard-timeline')

  await asOwner(page, 'priya')
  const priyaText = await page.locator('.scroll').innerText()
  rec('second owner sees only their pet', priyaText.includes('Luna') && !priyaText.includes('Buddy'))

  // Pickup confirm — Buddy / Jamie
  await asStaff(page, 'drsmith')
  await openPatient(page, 'Buddy')
  await page.getByRole('button', { name: 'Schedule Pickup' }).click()
  await page.getByTestId('send-pickup').click()
  await page.getByText('Pickup request sent to owner').waitFor()
  await asOwner(page, 'jamie')
  await page.getByText('Buddy is ready to come home!', { exact: true }).waitFor()
  rec('owner sees pickup request card', true)
  await shot(page, '05-owner-pickup-request')
  await page.getByTestId('confirm-pickup').click()
  await page.getByText('Pickup confirmed for').waitFor()
  rec('owner confirm works', true)

  await asStaff(page, 'sarah')
  await page.getByRole('button', { name: 'Pickups' }).click()
  await page.getByText('Confirmed').first().waitFor()
  rec('staff sees confirmed pickup', true)
  await shot(page, '06-staff-pickup-dashboard')

  // Decline — Luna / Priya
  await asStaff(page, 'drsmith')
  await openPatient(page, 'Luna')
  await page.getByRole('button', { name: 'Schedule Pickup' }).click()
  await page.getByTestId('send-pickup').click()
  await page.getByText('Pickup request sent to owner').waitFor()
  await asOwner(page, 'priya')
  await page.getByTestId('decline-pickup').click()
  await page.getByText("We'll be in touch shortly").waitFor()
  rec('owner can decline pickup', true)
  await asStaff(page, 'sarah')
  await page.getByRole('button', { name: 'Pickups' }).click()
  await page.getByText('Declined').first().waitFor()
  rec('staff alert after decline with Call owner', (await page.getByRole('link', { name: 'Call owner' }).count()) > 0)

  // Fast demo escalation on a fresh pickup for Buddy (replace confirmed)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: /Fast demo/ }).click()
  rec('fast demo control exists', true)
  await asStaff(page, 'maria')
  await page.getByRole('button', { name: 'Settings' }).click()
  // already fast? shared state should have it
  await page.getByRole('button', { name: 'Patients' }).click()
  await openPatient(page, 'Buddy')
  await page.getByRole('button', { name: 'Schedule Pickup' }).click()
  // must confirm replace
  const replace = page.getByText('Cancel the current request and send a new time')
  if (await replace.count()) await replace.click()
  await page.getByTestId('send-pickup').click()
  await page.getByText('Pickup request sent to owner').waitFor()

  console.log('Waiting 22s for owner reminder...')
  await page.waitForTimeout(22000)
  await asOwner(page, 'jamie')
  await page.getByLabel('Notifications').click()
  const reminderShown = (await page.getByText(/Reminder: confirm Buddy/i).count()) > 0
  rec('no-response reminder fires in Fast demo (~20s)', reminderShown)

  console.log('Waiting another 22s for staff Needs a Call...')
  await page.waitForTimeout(22000)
  await asStaff(page, 'sarah')
  await page.getByRole('button', { name: 'Pickups' }).click()
  const needsCall = (await page.getByText('Needs a Call').count()) > 0
  rec('no-response escalates to Needs a Call (~40s)', needsCall)
} catch (err) {
  rec('unhandled test error', false, String(err && err.message ? err.message : err).slice(0, 500))
  try { await shot(page, '99-error') } catch {}
  console.error(err)
}

async function overflowInfo(p) {
  return p.evaluate(() => {
    const w = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    const c = document.documentElement.clientWidth
    return { ok: w <= c + 2, w, c }
  })
}

async function staffWideChecks(browser, prefix, viewport, expectFeed) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: prefix === 'ipad',
    deviceScaleFactor: prefix === 'ipad' ? 2 : 1,
  })
  const p = await ctx.newPage()
  p.setDefaultTimeout(12000)
  try {
    await wipe(p)
    await asStaff(p, 'maria')
    await p.getByTestId('staff-wide').waitFor()
    rec(`${prefix} staff uses wide layout`, true)
    rec(`${prefix} sidebar has Patients, Pickups, Updates, Settings, Staff management`,
      (await p.locator('.side-link').filter({ hasText: 'Patients' }).count()) > 0 &&
      (await p.locator('.side-link').filter({ hasText: 'Pickups' }).count()) > 0 &&
      (await p.locator('.side-link').filter({ hasText: 'Updates' }).count()) > 0 &&
      (await p.locator('.side-link').filter({ hasText: 'Settings' }).count()) > 0 &&
      (await p.locator('.side-link').filter({ hasText: 'Staff management' }).count()) > 0)
    rec(`${prefix} phone tabbar hidden`, (await p.locator('.tabbar').count()) === 0)
    await p.locator('article').filter({ hasText: 'Buddy' }).click()
    await p.getByText('Visit Timeline').waitFor()
    await shot(p, `${prefix}-staff-dashboard`)
    const ov1 = await overflowInfo(p)
    rec(`${prefix} patients no horizontal overflow`, ov1.ok, `scroll=${ov1.w} viewport=${ov1.c}`)
    await p.getByRole('button', { name: 'Schedule Pickup' }).click()
    await p.getByTestId('send-pickup').click()
    await p.getByText('Pickup request sent to owner').waitFor()
    await p.locator('.side-link').filter({ hasText: 'Pickups' }).click()
    await p.locator('.pickup-table').waitFor()
    rec(`${prefix} pickups table visible`, true)
    rec(`${prefix} pickup status color`, (await p.locator('.status-dot.amber, .status-flag.status-amber').count()) > 0)
    await shot(p, `${prefix}-staff-pickups`)
    const ov2 = await overflowInfo(p)
    rec(`${prefix} pickups no horizontal overflow`, ov2.ok, `scroll=${ov2.w} viewport=${ov2.c}`)
    if (expectFeed) rec(`${prefix} live feed column`, (await p.getByTestId('live-feed').count()) > 0)
    else rec(`${prefix} no live feed column`, (await p.getByTestId('live-feed').count()) === 0)
    await asOwner(p, 'jamie')
    rec(`${prefix} owner stays in phone column`, (await p.locator('.app-shell.owner-mode .phone').count()) > 0)
    await p.getByText('Visit Timeline').waitFor()
    await shot(p, `${prefix}-owner`)
    const ov3 = await overflowInfo(p)
    rec(`${prefix} owner no horizontal overflow`, ov3.ok, `scroll=${ov3.w} viewport=${ov3.c}`)
  } catch (err) {
    rec(`${prefix} unhandled error`, false, String(err && err.message ? err.message : err).slice(0, 400))
    try { await shot(p, `${prefix}-error`) } catch {}
    console.error(err)
  } finally {
    await ctx.close()
  }
}

// ---- Pet + owner profiles ----
try {
  await wipe(page)
  await asStaff(page, 'sarah')
  await openPatient(page, 'Buddy')
  rec('tap Buddy opens profile', (await page.getByTestId('patient-profile').count()) > 0)
  rec('profile shows patient ID', (await page.getByTestId('patient-id').innerText()).includes('PG-000101'))
  rec('overview has visit info and timeline',
    (await page.getByTestId('visit-info').count()) > 0 &&
    (await page.getByText('Visit Timeline').count()) > 0 &&
    (await page.getByRole('button', { name: '+ Send Update' }).count()) > 0 &&
    (await page.getByRole('button', { name: 'Schedule Pickup' }).count()) > 0)
  await shot(page, 'profile-overview-phone')

  await page.getByTestId('profile-tab-pet').click()
  await page.getByTestId('pet-section').waitFor()
  rec('pet tab shows identifying fields',
    (await page.getByText('Golden Retriever').count()) > 0 &&
    (await page.getByText('PG-000101').count()) > 0 &&
    (await page.getByTestId('behavioral-notes').count()) > 0)
  await shot(page, 'profile-pet-phone')

  await page.getByTestId('profile-tab-owner').click()
  await page.getByTestId('owner-section').waitFor()
  rec('owner tab has Call, Email, and Copy actions',
    (await page.getByTestId('contact-call').count()) > 0 &&
    (await page.getByTestId('contact-email').count()) > 0 &&
    (await page.getByTestId('contact-copy').count()) > 0)
  rec('owner tab shows Jamie contact details',
    (await page.getByText('Jamie Carter').count()) > 0 &&
    (await page.getByText('jamie.carter@example.com').count()) > 0)
  await shot(page, 'profile-owner-phone')

  await page.getByTestId('profile-tab-notes').click()
  await page.getByTestId('staff-notes-section').waitFor()
  rec('staff notes section is labeled private',
    (await page.getByText('Staff only — not visible to owners').count()) > 0 &&
    (await page.getByText('Buddy becomes mouthy during nail trims').count()) > 0)
  await shot(page, 'profile-staff-notes-phone')

  await page.getByTestId('profile-tab-pet').click()
  await page.getByTestId('edit-pet').click()
  await shot(page, 'profile-edit-mode-phone')
  const nameField = page.getByTestId('field-pet-name')
  await nameField.fill('')
  await page.getByTestId('save-profile').click()
  rec('validation requires pet name', (await page.getByTestId('field-error').filter({ hasText: 'Pet name is required' }).count()) > 0)
  await nameField.fill('Buddy')
  await page.getByTestId('field-weight').fill('69.5')
  await page.getByTestId('save-profile').click()
  await page.getByText('Saved', { exact: true }).waitFor()
  rec('saved toast after pet edit', true)
  rec('weight updated for Sarah', (await page.getByText('69.5 lb').count()) > 0)
  rec('last edited by shown', (await page.getByTestId('last-edited').innerText()).includes('Sarah'))

  await page.getByTestId('profile-tab-owner').click()
  await page.getByTestId('edit-owner').click()
  await page.getByTestId('field-owner-phone').fill('not-a-phone')
  await page.getByTestId('save-owner').click()
  rec('validation rejects bad phone', (await page.getByTestId('field-error').filter({ hasText: 'valid phone' }).count()) > 0)
  await page.getByTestId('field-owner-phone').fill('(570) 555-0190')
  await page.getByTestId('save-owner').click()
  await page.getByText('Saved', { exact: true }).waitFor()
  rec('owner phone saved by Sarah', (await page.getByText('(570) 555-0190').count()) > 0)

  await page.getByTestId('profile-tab-notes').click()
  const noteBox = page.getByTestId('new-staff-note')
  await noteBox.scrollIntoViewIfNeeded()
  await noteBox.fill('Check incision at evening rounds — unique staff note alpha.')
  await page.getByTestId('add-staff-note').evaluate((el) => el.click())
  await page.getByText('unique staff note alpha').waitFor()
  rec('staff can add a private note', (await page.getByText('unique staff note alpha').count()) > 0)

  await asStaff(page, 'jessica')
  await openPatient(page, 'Buddy')
  await page.getByTestId('profile-tab-pet').click()
  rec('Jessica sees Sarah weight change', (await page.getByText('69.5 lb').count()) > 0)
  rec('receptionist cannot edit pet fields', (await page.getByTestId('edit-pet').count()) === 0)
  rec('role hint explains receptionist limits', (await page.getByTestId('role-hint').innerText()).includes('view-only'))
  await page.getByTestId('profile-tab-owner').click()
  rec('Jessica sees Sarah phone change', (await page.getByText('(570) 555-0190').count()) > 0)
  rec('receptionist can edit owner contact', (await page.getByTestId('edit-owner').count()) > 0)
  rec('added private note visible to other staff', (await page.getByTestId('profile-tab-notes').click(), await page.getByText('unique staff note alpha').count()) > 0)

  const ids = await page.evaluate(async () => {
    const dbp = indexedDB.open('pawgress-demo', 1)
    return await new Promise((resolve) => {
      dbp.onsuccess = () => {
        const tx = dbp.result.transaction('kv')
        const q = tx.objectStore('kv').get('workspace:pawgress-demo')
        q.onsuccess = () => resolve((q.result?.patients ?? []).map((x) => x.patientId))
        q.onerror = () => resolve([])
      }
      dbp.onerror = () => resolve([])
    })
  })
  const unique = new Set(ids)
  rec('patient IDs are unique and generated', unique.size === ids.length && ids.every((id) => /^PG-\d{6}$/.test(id)), ids.join(','))

  await page.getByLabel('Back').click()
  await page.getByTestId('all-patients-tab').click()
  await page.getByTestId('patient-search').fill('PG-000102')
  rec('search by patient ID finds Luna', (await page.locator('article').filter({ hasText: 'Luna' }).count()) > 0 && (await page.locator('article').filter({ hasText: 'Buddy' }).count()) === 0)
  await page.getByTestId('patient-search').fill('')
  await page.getByTestId('add-patient').click()
  await page.getByTestId('add-pet-name').fill('Coco')
  await page.getByTestId('add-owner-name').fill('Pat Quinn')
  await page.getByTestId('add-phone').fill('(570) 555-0122')
  await page.getByTestId('add-patient-save').click()
  await page.getByTestId('patient-profile').waitFor()
  rec('add patient generates a new ID', (await page.getByTestId('patient-id').innerText()).includes('PG-000107'))

  const PRIVATE_SNIPPETS = [
    'Buddy becomes mouthy during nail trims',
    'unique staff note alpha',
    'Friendly greeter who jumps up when excited',
    'Luna is a flight risk',
    'Priya Shah',
    'behavioral notes',
  ]
  await asOwner(page, 'jamie')
  await page.locator('.tabbar').getByRole('button', { name: 'My Pets' }).click()
  await page.getByTestId('owner-pet-card-buddy').click()
  await page.getByTestId('owner-pet-profile').waitFor()
  const jamieDom = await page.evaluate(() => document.body.innerText)
  rec('Jamie sees Buddy profile basics',
    jamieDom.includes('Buddy') &&
    jamieDom.includes('PG-000101') &&
    jamieDom.includes('Golden Retriever') &&
    jamieDom.includes('Bud'))
  rec('Jamie DOM has no private notes, behavioral notes, or other owners',
    PRIVATE_SNIPPETS.every((s) => !jamieDom.includes(s)),
    PRIVATE_SNIPPETS.filter((s) => jamieDom.includes(s)).join(' | '))
  await shot(page, 'owner-pet-profile')

  await page.locator('.tabbar').getByRole('button', { name: 'Account', exact: true }).click()
  const acct = await page.getByTestId('owner-account').innerText()
  rec('Jamie account shows own contact only',
    acct.includes('Jamie Carter') && acct.includes('(570) 555-0190') && acct.includes('jamie.carter@example.com') && !acct.includes('Priya'))

  await asOwner(page, 'priya')
  await page.locator('.tabbar').getByRole('button', { name: 'My Pets' }).click()
  await page.getByTestId('owner-pet-card-luna').click()
  await page.getByTestId('owner-pet-profile').waitFor()
  const priyaDom = await page.evaluate(() => document.body.innerText)
  rec('Priya sees only Luna and not Buddy or staff notes',
    priyaDom.includes('Luna') &&
    priyaDom.includes('PG-000102') &&
    !priyaDom.includes('Buddy') &&
    !priyaDom.includes('Jamie Carter') &&
    !priyaDom.includes('Luna is a flight risk') &&
    !priyaDom.includes('Flighty in new spaces'))
} catch (err) {
  rec('profile tests unhandled error', false, String(err && err.message ? err.message : err).slice(0, 500))
  try { await shot(page, '99-profile-error') } catch {}
  console.error(err)
}

try {
  await staffWideChecks(browser, 'ipad', { width: 820, height: 1180 }, false)
  await staffWideChecks(browser, 'desktop', { width: 1440, height: 900 }, true)
} catch (err) {
  rec('wide viewport runner error', false, String(err).slice(0, 400))
}

// Desktop profile screenshot (fresh staff session at 1440)
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  p.setDefaultTimeout(12000)
  await wipe(p)
  await asStaff(p, 'sarah')
  await p.locator('article').filter({ hasText: 'Buddy' }).click()
  await p.getByTestId('patient-profile').waitFor()
  await p.getByText('Visit Timeline').waitFor()
  await shot(p, 'profile-desktop')
  rec('desktop profile screenshot captured', true)
  await ctx.close()
} catch (err) {
  rec('desktop profile screenshot', false, String(err && err.message ? err.message : err).slice(0, 400))
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log('\n======== RESULTS ========')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
console.log(failed.length ? `${failed.length} failed` : 'all passed')
process.exit(failed.length ? 1 : 0)
