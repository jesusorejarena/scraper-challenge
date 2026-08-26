import { runScraper } from './scraper';

runScraper().catch((error) => {
  console.error('Scraper failed:', error);
});
