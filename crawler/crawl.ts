import { fileURLToPath } from 'url';
import { log } from "./util";
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function crawl() {
    log('Starting crawl...');

    var rooms = await fetchRooms();

    log('Checking flv availability...');
    var flvAvailabilities: FlvAvailability[] = [];

    // check and print logs for progress
    for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const flvAvailability = await checkFlvAvailability(room);
        if (flvAvailability) {
            flvAvailabilities.push(flvAvailability);
        }
        log(`Progress: ${i + 1}/${rooms.length} (${Math.round((i + 1) / rooms.length * 100)}%)`);
    }

    log('Flv availability checked.');
    log(JSON.stringify(flvAvailabilities));
    log('\nWriting flv availability to file...');

    writeToFile(flvAvailabilities);

    log('Crawl finished.');
}

type DataStore = {
    /**
     * Last updated timestamp in milliseconds as string
     */
    lastUpdated: string;
    /**
     * Flv availability data, sorted by subAreaId
     */
    data: FlvData[];
}

type FlvData = {
    areaId: string;
    areaName: string;
    subAreaId: string;
    subAreaName: string;
    flvAvailabilities: (1 | 0)[];
}

type Room = {
    areaId: string;
    areaName: string;
    subAreaId: string;
    subAreaName: string;
    roomId: string;
}

type FlvAvailability = {
    areaId: string;
    areaName: string;
    subAreaId: string;
    subAreaName: string;
    flvAvailable: boolean;
}

function writeToFile(flvAvailabilities: FlvAvailability[]) {
    const dataPath = path.join(__dirname, '../src/data.json');

    // read existing data from file with fs
    let store: DataStore = {
        lastUpdated: '',
        data: [],
    };
    if (fs.existsSync(dataPath)) {
        store = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    // merge existing data with new data
    var map = new Map<string, FlvData>();
    if (typeof store.data === 'object' && store.data.length > 0) {
        for (const flvAvailability of store.data) {
            map.set(flvAvailability.subAreaId, flvAvailability);
        }
    }

    for (const flvAvailability of flvAvailabilities) {
        if (map.has(flvAvailability.subAreaId)) {
            let data: FlvData = map.get(flvAvailability.subAreaId)!;
            data.flvAvailabilities.push(flvAvailability.flvAvailable ? 1 : 0);
            map.set(flvAvailability.subAreaId, {
                areaId: flvAvailability.areaId,
                areaName: flvAvailability.areaName,
                subAreaId: flvAvailability.subAreaId,
                subAreaName: flvAvailability.subAreaName,
                flvAvailabilities: data.flvAvailabilities.slice(-10),
            });
        } else {
            map.set(flvAvailability.subAreaId, {
                areaId: flvAvailability.areaId,
                areaName: flvAvailability.areaName,
                subAreaId: flvAvailability.subAreaId,
                subAreaName: flvAvailability.subAreaName,
                flvAvailabilities: [flvAvailability.flvAvailable ? 1 : 0],
            });
        }
    }

    // sort by subAreaId as number ascending
    store = {
        lastUpdated: new Date().getTime().toString(),
        data: Array.from(map.values()).sort((a, b) => parseInt(a.subAreaId) - parseInt(b.subAreaId)),
    }

    // write data to file with fs
    fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

async function checkFlvAvailability(room: Room): Promise<FlvAvailability | false> {
    const resp = await fetch(`https://live.bilibili.com/${room.roomId}`, {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "zh-CN",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "Referer": "https://live.bilibili.com/all",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });

    const html = await resp.text();

    // make sure the html contains `.m3u8?` otherwise it's not a valid sample
    const validSample = html.includes('.m3u8?');

    if (!validSample) {
        log(`Invalid sample for room ${room.roomId}, skipping...`);
        return false;
    }

    // check if the html contains `.flv?`
    const flvAvailable = html.includes('.flv?');

    return {
        areaId: room.areaId,
        areaName: room.areaName,
        subAreaId: room.subAreaId,
        subAreaName: room.subAreaName,
        flvAvailable
    }
}

async function fetchRooms(): Promise<Room[]> {
    const pagesToFetch = 10;
    const roomsByOnline: Room[] = [];
    const roomsByLiveTime: Room[] = [];

    for (let i = 1; i <= pagesToFetch; i++) {
        log(`Fetching rooms page ${i}...`);
        let resp = await fetch(`https://api.live.bilibili.com/xlive/web-interface/v1/second/getListByArea?sort=online&page=${i}&page_size=30&platform=web`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN",
                "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Referer": "https://live.bilibili.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        let obj = await resp.json() as any;

        if (obj.code !== 0) {
            throw new Error(`Failed to fetch rooms: (${obj.code}) ${obj.message}`);
        }

        if (typeof obj.data.list === 'object' && typeof obj.data.list.length === 'number' && obj.data.list.length > 0) {
            for (const room of obj.data.list) {
                roomsByOnline.push({
                    areaId: room.area_v2_parent_id,
                    areaName: room.area_v2_parent_name,
                    subAreaId: room.area_v2_id,
                    subAreaName: room.area_v2_name,
                    roomId: room.roomid
                });
            }
        }
    }

    for (let i = 1; i <= pagesToFetch; i++) {
        log(`Fetching rooms page ${i}...`);
        const resp = await fetch(`https://api.live.bilibili.com/xlive/web-interface/v1/second/getListByArea?sort=livetime&page=${i}&page_size=30&platform=web`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN",
                "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Referer": "https://live.bilibili.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        let obj = await resp.json() as any;

        if (obj.code !== 0) {
            throw new Error(`Failed to fetch rooms: (${obj.code}) ${obj.message}`);
        }
        if (typeof obj.data.list === 'object' && typeof obj.data.list.length === 'number' && obj.data.list.length > 0) {
            for (const room of obj.data.list) {
                roomsByLiveTime.push({
                    areaId: room.area_v2_parent_id,
                    areaName: room.area_v2_parent_name,
                    subAreaId: room.area_v2_id,
                    subAreaName: room.area_v2_name,
                    roomId: room.roomid
                });
            }
        }
    }

    const rooms: Room[] = [];

    // merge rooms from both lists by alternating between them
    while (roomsByOnline.length > 0 && roomsByLiveTime.length > 0) {
        let room = roomsByOnline.shift();
        if (room) {
            rooms.push(room);
        }
        room = roomsByLiveTime.shift();
        if (room) {
            rooms.push(room);
        }
    }

    log(`Fetched ${rooms.length} rooms, cleaning up...`);

    // deduplicate rooms by their subAreaId, keep the last one
    var areaMap = new Map<string, Room[]>();
    for (const room of rooms) {
        if (areaMap.has(room.subAreaId)) {
            const arr = areaMap.get(room.subAreaId);
            // store up to 2 rooms per subAreaId
            if (arr && arr.length < 2) {
                arr.push(room);
            }
        } else {
            areaMap.set(room.subAreaId, [room]);
        }
    }

    const deduplicatedRooms: Room[] = Array.from(areaMap.values()).flat();
    log(`Deduplicated to ${deduplicatedRooms.length} rooms.`);

    return deduplicatedRooms;
}
