import * as migration_20261018_141013_initial from './20261018_141013_initial';
import * as migration_20261018_151612_media_and_logo from './20261018_151612_media_and_logo';
import * as migration_20261019_154410_pages_and_page_links from './20261019_154410_pages_and_page_links';
import * as migration_20261019_162824_teachings from './20261019_162824_teachings';
import * as migration_20261019_165149_events_and_announcements from './20261019_165149_events_and_announcements';
import * as migration_20261019_180941_clergy_and_departments from './20261019_180941_clergy_and_departments';
import * as migration_20261019_182222_galleries_videos_posts_homepage from './20261019_182222_galleries_videos_posts_homepage';
import * as migration_20261019_184921_homepage_without_announcement_bar from './20261019_184921_homepage_without_announcement_bar';
import * as migration_20261020_172506_site_settings_map_location from './20261020_172506_site_settings_map_location';
import * as migration_20261020_182918_inquiries from './20261020_182918_inquiries';
import * as migration_20261021_143613_site_settings_share_image from './20261021_143613_site_settings_share_image';
import * as migration_20261027_192021_baptism_requests_case_events from './20261027_192021_baptism_requests_case_events';

export const migrations = [
  {
    up: migration_20261018_141013_initial.up,
    down: migration_20261018_141013_initial.down,
    name: '20261018_141013_initial',
  },
  {
    up: migration_20261018_151612_media_and_logo.up,
    down: migration_20261018_151612_media_and_logo.down,
    name: '20261018_151612_media_and_logo',
  },
  {
    up: migration_20261019_154410_pages_and_page_links.up,
    down: migration_20261019_154410_pages_and_page_links.down,
    name: '20261019_154410_pages_and_page_links',
  },
  {
    up: migration_20261019_162824_teachings.up,
    down: migration_20261019_162824_teachings.down,
    name: '20261019_162824_teachings',
  },
  {
    up: migration_20261019_165149_events_and_announcements.up,
    down: migration_20261019_165149_events_and_announcements.down,
    name: '20261019_165149_events_and_announcements',
  },
  {
    up: migration_20261019_180941_clergy_and_departments.up,
    down: migration_20261019_180941_clergy_and_departments.down,
    name: '20261019_180941_clergy_and_departments',
  },
  {
    up: migration_20261019_182222_galleries_videos_posts_homepage.up,
    down: migration_20261019_182222_galleries_videos_posts_homepage.down,
    name: '20261019_182222_galleries_videos_posts_homepage',
  },
  {
    up: migration_20261019_184921_homepage_without_announcement_bar.up,
    down: migration_20261019_184921_homepage_without_announcement_bar.down,
    name: '20261019_184921_homepage_without_announcement_bar',
  },
  {
    up: migration_20261020_172506_site_settings_map_location.up,
    down: migration_20261020_172506_site_settings_map_location.down,
    name: '20261020_172506_site_settings_map_location',
  },
  {
    up: migration_20261020_182918_inquiries.up,
    down: migration_20261020_182918_inquiries.down,
    name: '20261020_182918_inquiries',
  },
  {
    up: migration_20261021_143613_site_settings_share_image.up,
    down: migration_20261021_143613_site_settings_share_image.down,
    name: '20261021_143613_site_settings_share_image',
  },
  {
    up: migration_20261027_192021_baptism_requests_case_events.up,
    down: migration_20261027_192021_baptism_requests_case_events.down,
    name: '20261027_192021_baptism_requests_case_events'
  },
];
