/**
 * Public pages: every URL announced to Google in sitemap.xml must answer 200
 * (regression: /faq was in the sitemap but returned 404), and the App Store
 * badges stay hidden until saas/js/app-links.js has a link.
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findBookings: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { server } = require('../server');

test('every static sitemap URL answers 200', async () => {
    const res = await request(server).get('/sitemap.xml').set('Host', 'kreno.ch').buffer(true).parse((r, cb) => { let d = ''; r.on('data', c => { d += c; }); r.on('end', () => cb(null, d)); });
    expect(res.status).toBe(200);
    const paths = [...res.body.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
    expect(paths).toContain('/faq');
    for (const p of paths) {
        const page = await request(server).get(p);
        expect({ path: p, status: page.status }).toEqual({ path: p, status: 200 });
    }
});

test('robots.txt and sitemap.xml name kreno.ch, never an old domain', async () => {
    const robots = await request(server).get('/robots.txt').set('Host', 'barberpro-saa.onrender.com');
    expect(robots.text).toContain('Sitemap: https://kreno.ch/sitemap.xml');
    const sitemap = await request(server).get('/sitemap.xml').set('Host', 'barberpro-saa.onrender.com')
        .buffer(true).parse((r, cb) => { let d = ''; r.on('data', c => { d += c; }); r.on('end', () => cb(null, d)); });
    const locs = [...sitemap.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const l of locs) expect(l).toMatch(/^https:\/\/kreno\.ch\//);
});

test.each(['/privacy', '/terms', '/support'])('%s (App Store listing URL) answers 200', async p => {
    expect((await request(server).get(p)).status).toBe(200);
});

test('App Store badges are hidden and served with the link script', async () => {
    const html = (await request(server).get('/')).text;
    const badges = html.match(/<a [^>]*data-appstore-link[^>]*>/g) || [];
    expect(badges.length).toBeGreaterThan(0);
    for (const a of badges) expect(a).toMatch(/\shidden[\s>]/);
    expect(html).toContain('/saas/js/app-links.js');
    expect((await request(server).get('/saas/images/app-store-badge-fr.svg')).headers['content-type']).toMatch(/svg/);
});

test('app-links.js only accepts an apps.apple.com link', () => {
    const src = fs.readFileSync(path.join(__dirname, '../saas/js/app-links.js'), 'utf8');
    expect(src).toMatch(/apps\\\.apple\\\.com/);
});
