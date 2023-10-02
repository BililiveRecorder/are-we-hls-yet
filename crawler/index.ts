import { CronJob } from 'cron';

const job = new CronJob(
    // runs every 4 hours at 0 minutes 30 seconds
    '30 0 */4 * * *',
    function () {
        console.log('You will see this message every second');
    }
);
job.start();

// listen for SIGINT signal (Ctrl+C)
process.on('SIGINT', function () {
    console.log('[CRAWL] SIGINT signal received. Stopping cronjob...');
    job.stop();
    process.exit();
});
