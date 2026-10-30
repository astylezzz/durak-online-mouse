import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:180000,use:{baseURL:'http://127.0.0.1:5173',launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}},webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI}});
