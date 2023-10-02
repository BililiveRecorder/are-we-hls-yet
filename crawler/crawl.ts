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
        flvAvailabilities.push(flvAvailability);
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
    data: FlvAvailability[];
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
    let data: DataStore = {
        lastUpdated: '',
        data: [],
    };
    if (fs.existsSync(dataPath)) {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    // merge existing data with new data
    var map = new Map<string, FlvAvailability>();
    for (const flvAvailability of data.data) {
        map.set(flvAvailability.subAreaId, flvAvailability);
    }

    for (const flvAvailability of flvAvailabilities) {
        map.set(flvAvailability.subAreaId, flvAvailability);
    }

    // sort by subAreaId as number ascending
    data.data = Array.from(map.values()).sort((a, b) => parseInt(a.subAreaId) - parseInt(b.subAreaId));
    data.lastUpdated = new Date().getTime().toString();

    // write data to file with fs
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

async function checkFlvAvailability(room: Room): Promise<FlvAvailability> {
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
    const pagesToFetch = 5; // 5 * 2 * 30 = 300 rooms

    const rooms: Room[] = [];

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

        for (const room of obj.data.list) {
            rooms.push({
                areaId: room.area_v2_parent_id,
                areaName: room.area_v2_parent_name,
                subAreaId: room.area_v2_id,
                subAreaName: room.area_v2_name,
                roomId: room.roomid
            });
        }
    }

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

        for (const room of obj.data.list) {
            rooms.push({
                areaId: room.area_v2_parent_id,
                areaName: room.area_v2_parent_name,
                subAreaId: room.area_v2_id,
                subAreaName: room.area_v2_name,
                roomId: room.roomid
            });
        }
    }

    log(`Fetched ${rooms.length} rooms, cleaning up...`);

    // deduplicate rooms by their subAreaId, keep the first one
    var areaMap = new Map<string, Room>();
    for (const room of rooms) {
        if (!areaMap.has(room.subAreaId)) {
            areaMap.set(room.subAreaId, room);
        }
    }

    const deduplicatedRooms: Room[] = Array.from(areaMap.values());
    log(`Deduplicated to ${deduplicatedRooms.length} rooms.`);

    return deduplicatedRooms;
}
