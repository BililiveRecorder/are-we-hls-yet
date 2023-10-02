import { CronJob } from 'cron';
import crawl from './crawl';
import { simpleGit, CleanOptions } from 'simple-git';
import { log } from './util';

const job = new CronJob(
    // runs every 1 hour at 16 minutes 30 seconds
    '30 28 * * * *',
    run,
);
job.start();

run();

// listen for SIGINT signal (Ctrl+C)
process.on('SIGINT', function () {

    log('[CRAWL] SIGINT signal received. Stopping cronjob...');
    job.stop();
    process.exit();
});

async function run() {
    log('[CRAWL] Starting crawl...');
    try {
        await crawl();
    } catch (error) {
        log('[CRAWL] Error while crawling:');
        log(error);
        return;
    }

    log('[CRAWL] Crawl finished. Committing to git...');
    try {
        await addCommitPush();
    } catch (error) {
        log('[CRAWL] Error while committing to git:');
        log(error);
    }
}

/**
 * Add, commit and push to git
 */
async function addCommitPush() {
    const git = simpleGit({
        config: [
            'user.name="Genteure (Bot)"',
            'user.email="are-we-hls-yet-bot@genteure.com"'
        ]
    });

    await git.add('src/data.json');
    await git.commit('Automated data update')
    await git.push();
    log('[CRAWL] Pushed to git')
}
