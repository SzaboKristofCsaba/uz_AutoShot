const http = require('http');
const path = require('path');
const fs   = require('fs');
const { PNG } = require('pngjs');

const PORT       = 3959;
const RESOURCE   = GetCurrentResourceName();
const RES_PATH   = GetResourcePath(RESOURCE);
const OUTPUT_DIR = path.join(RES_PATH, 'shots');

try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (err) {
    console.log('^1[uz_AutoShot]^0 Output dir error: ' + err.message);
}

let manifestCache = null;
function buildItems() {
    const items = [];
    if (!fs.existsSync(OUTPUT_DIR)) return items;

    function walkDir(dir, rel) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
            const entryRel = rel ? rel + '/' + entry.name : entry.name;
            if (entry.isDirectory()) {
                walkDir(path.join(dir, entry.name), entryRel);
            } else if (/\.(png|webp|jpg)$/.test(entry.name)) {
                const parts = entryRel.replace(/\.(png|webp|jpg)$/, '').split('/');
                if (parts.length >= 3) {
                    const gender    = parts[0];
                    const catPart   = parts[1];
                    const drawPart  = parts[2];
                    const isProp    = catPart.startsWith('prop_');
                    const catId     = isProp ? parseInt(catPart.replace('prop_', '')) : parseInt(catPart);
                    const drawParts = drawPart.split('_');
                    items.push({
                        url:      'http://127.0.0.1:' + PORT + '/shots/' + entryRel,
                        file:     entryRel,
                        gender:   gender,
                        type:     isProp ? 'prop' : 'component',
                        id:       catId || 0,
                        drawable: parseInt(drawParts[0]) || 0,
                        texture:  parseInt(drawParts[1]) || 0,
                    });
                }
            }
        }
    }

    walkDir(OUTPUT_DIR, '');
    return items;
}

function getManifest() {
    if (!manifestCache) {
        const items = buildItems();
        manifestCache = { generatedAt: Date.now(), total: items.length, items };
    }
    return manifestCache;
}

function parseMultipart(body, boundary) {
    const boundaryBuf = Buffer.from('--' + boundary);
    const crlf        = Buffer.from('\r\n');
    const headerEnd   = Buffer.from('\r\n\r\n');

    // Find boundary positions
    let start = indexOf(body, boundaryBuf, 0);
    if (start === -1) return null;

    // Skip header after first boundary
    const headStart = start + boundaryBuf.length + crlf.length;
    const headEnd   = indexOf(body, headerEnd, headStart);
    if (headEnd === -1) return null;

    // File data start
    const dataStart = headEnd + headerEnd.length;

    // Find next boundary -> file data end
    const nextBoundary = indexOf(body, boundaryBuf, dataStart);
    if (nextBoundary === -1) return null;

    // Strip trailing \r\n
    const dataEnd = nextBoundary - crlf.length;

    // Try to extract filename from header
    const headerStr = body.slice(headStart, headEnd).toString('utf-8');
    let filename = 'upload';
    const fnMatch = headerStr.match(/filename="([^"]+)"/);
    if (fnMatch) filename = fnMatch[1];

    return {
        data: body.slice(dataStart, dataEnd),
        filename,
    };
}

function indexOf(buf, pattern, offset) {
    for (let i = offset; i <= buf.length - pattern.length; i++) {
        let found = true;
        for (let j = 0; j < pattern.length; j++) {
            if (buf[i + j] !== pattern[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}

function removeGreenScreen(pngBuffer) {
    const png = PNG.sync.read(pngBuffer);
    const d = png.data;
    let removed = 0;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];

        // Green channel must be dominant (significantly higher than R and B)
        const gOverR = g - r;
        const gOverB = g - b;

        if (g > 30 && gOverR > 10 && gOverB > 10) {
            // Green dominance ratio (0-1)
            const greenness = Math.min(1, (gOverR + gOverB) / (g + 1));
            d[i + 3] = Math.round(255 * (1 - greenness));
            removed++;
        }
    }

    console.log('^2[uz_AutoShot]^0 Chroma key: ' + removed + '/' + (d.length / 4) + ' pixels made transparent');
    return PNG.sync.write(png, { colorType: 6 });
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/')) {
        const rawPath  = req.url.split('?')[0];
        const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
        const params   = {};
        queryStr.split('&').forEach(p => {
            const idx = p.indexOf('=');
            if (idx > 0) params[decodeURIComponent(p.slice(0, idx))] = decodeURIComponent(p.slice(idx + 1));
        });

        const parts = rawPath.slice(5).split('/').filter(Boolean);
        const route = parts[0];

        res.setHeader('Content-Type', 'application/json');

        if (route === 'stats') {
            const manifest = getManifest();
            const byGender = {}, byType = {};
            for (const item of manifest.items) {
                byGender[item.gender] = (byGender[item.gender] || 0) + 1;
                byType[item.type]     = (byType[item.type]     || 0) + 1;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ total: manifest.total, byGender, byType }));
            return;
        }

        if (route === 'exists') {
            const { gender, type, id, drawable, texture } = params;
            const prefix = type === 'prop' ? 'prop_' : '';
            const exts   = ['.png', '.webp', '.jpg'];
            let found    = false;
            for (const e of exts) {
                const fp = path.join(OUTPUT_DIR, gender, prefix + id, drawable + '_' + texture + e);
                if (fs.existsSync(fp)) { found = true; break; }
            }
            res.writeHead(200);
            res.end(JSON.stringify({ exists: found }));
            return;
        }

        if (route === 'manifest') {
            let items         = getManifest().items;
            const filterGender = parts[1] || null;
            const filterType   = parts[2] || null;
            const filterId     = parts[3] !== undefined ? parseInt(parts[3]) : undefined;

            if (filterGender)           items = items.filter(i => i.gender === filterGender);
            if (filterType)             items = items.filter(i => i.type === filterType);
            if (filterId !== undefined) items = items.filter(i => i.id === filterId);

            res.writeHead(200);
            res.end(JSON.stringify({ generatedAt: getManifest().generatedAt, total: items.length, items }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Unknown API route' }));
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/shots/')) {
        const relPath = decodeURIComponent(req.url.split('?')[0].replace('/shots/', ''));
        const filePath = path.join(OUTPUT_DIR, relPath);

        if (!filePath.startsWith(OUTPUT_DIR)) {
            res.writeHead(403);
            res.end();
            return;
        }

        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end();
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
        const mime = mimeMap[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': mime,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(fs.readFileSync(filePath));
        return;
    }

    if (req.method === 'POST' && req.url === '/upload') {
        const chunks = [];
        let totalSize = 0;
        const MAX_SIZE = 15 * 1024 * 1024;

        req.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_SIZE) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'File too large' }));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks);

                const contentType = req.headers['content-type'] || '';
                const boundaryMatch = contentType.match(/boundary=(.+)/);

                if (!boundaryMatch) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No boundary found' }));
                    return;
                }

                const boundary = boundaryMatch[1].trim();
                const parsed = parseMultipart(body, boundary);

                if (!parsed || !parsed.data || parsed.data.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No file data parsed' }));
                    return;
                }

                const xFilename    = req.headers['x-filename'] || 'unknown';
                const wantFormat   = req.headers['x-format'] || 'png';
                const wantTransp   = req.headers['x-transparent'] === '1';

                let outputData = parsed.data;
                let ext = wantFormat;

                if (wantTransp) {
                    try {
                        outputData = removeGreenScreen(parsed.data);
                        ext = 'png';
                    } catch (e) {
                        console.log('^3[uz_AutoShot]^0 Chroma key skipped: ' + e.message);
                    }
                }

                const outputPath = path.join(OUTPUT_DIR, xFilename + '.' + ext);
                const dir = path.dirname(outputPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(outputPath, outputData);
                manifestCache = null;

                const sizeKB = Math.round(outputData.length / 1024);
                const label = wantTransp ? 'bg removed' : ext;
                console.log('^2[uz_AutoShot]^0 Saved: ' + xFilename + '.' + ext + ' (' + sizeKB + ' KB, ' + label + ')');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename: xFilename + '.' + ext }));
            } catch (err) {
                console.log('^1[uz_AutoShot]^0 Process error: ' + err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });

        req.on('error', (err) => {
            console.log('^1[uz_AutoShot]^0 Request error: ' + err.message);
        });

        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.on('error', (err) => {
    console.log('^1[uz_AutoShot]^0 Server error: ' + err.message);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('^2[uz_AutoShot]^0 Backend ready on http://127.0.0.1:' + PORT);
});

onNet('uz_autoshot:server:setBucket', (bucket) => {
    const src = source;
    SetPlayerRoutingBucket(src.toString(), bucket);
    console.log('^2[uz_AutoShot]^0 Player ' + src + ' -> bucket ' + bucket);
});

onNet('uz_autoshot:server:resetBucket', () => {
    const src = source;
    SetPlayerRoutingBucket(src.toString(), 0);
    console.log('^2[uz_AutoShot]^0 Player ' + src + ' -> bucket 0');
});

onNet('uz_autoshot:server:getClothingData', () => {
    const src = source;
    try {
        emitNet('uz_autoshot:client:receiveClothingData', src, getManifest().items);
    } catch (err) {
        console.log('^1[uz_AutoShot]^0 List error: ' + err.message);
        emitNet('uz_autoshot:client:receiveClothingData', src, []);
    }
});

on('uz_autoshot:getManifest', (gender) => {
    try {
        let items = getManifest().items;
        if (gender) items = items.filter(i => i.gender === gender);
        emit('uz_autoshot:manifestResult', { total: items.length, items });
    } catch (err) {
        emit('uz_autoshot:manifestResult', { total: 0, items: [] });
    }
});

