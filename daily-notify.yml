name: Daily Attendance Notification

on:
  schedule:
    # كل يوم الساعة 1 ظهر UTC = 3 مساءً Cairo (UTC+2)
    - cron: '0 13 * * *'
  workflow_dispatch:  # تشغيل يدوي للتجربة

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run notification script
        run: node notify.js
