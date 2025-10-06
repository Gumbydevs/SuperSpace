/*
  Simple analyzer to scan analytics_data daily/session files and report
  distribution of session durations. Run with: node tools\analyzeSessions.js
*/
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'server', 'analytics_data');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function analyze() {
  const dailyDir = path.join(dataDir, 'daily');
  const sessionsDir = path.join(dataDir, 'sessions');
  const report = {
    totalSessionCount: 0,
    lessThan60: 0,
    lessThan300: 0,
    lessThan600: 0,
    greaterOrEqual600: 0,
    sampleShort: [],
    sampleLong: [],
    allDurations: [],
  };

  if (fs.existsSync(dailyDir)) {
    const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const p = path.join(dailyDir, f);
      const data = readJson(p);
      if (!data || !Array.isArray(data.sessionDurations)) continue;
      for (const d of data.sessionDurations) {
        // durations in file should be seconds; fallback if huge (>10000) then treat as ms
        const dur = (typeof d === 'number' && isFinite(d)) ? (d > 10000 ? Math.round(d / 1000) : d) : 0;
        report.totalSessionCount++;
        report.allDurations.push(dur);
        if (dur < 60) { report.lessThan60++; if (report.sampleShort.length < 5) report.sampleShort.push(dur); }
        else if (dur < 300) { report.lessThan300++; }
        else if (dur < 600) { report.lessThan600++; }
        else { report.greaterOrEqual600++; if (report.sampleLong.length < 5) report.sampleLong.push(dur); }
      }
    }
  }

  // Also scan individual session files for context
  if (fs.existsSync(sessionsDir)) {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const p = path.join(sessionsDir, f);
      const data = readJson(p);
      if (!data) continue;
      // try to find session durations inside saved session objects
      if (data.gameStats && Array.isArray(data.gameStats.lifeDurations)) {
        // ignore
      }
    }
  }

  console.log('Session distribution summary:');
  console.log('  total sessions:', report.totalSessionCount);
  console.log('  < 60s:', report.lessThan60);
  console.log('  60-300s:', report.lessThan300);
  console.log('  300-600s:', report.lessThan600);
  console.log('  >=600s:', report.greaterOrEqual600);
  console.log('\nSample short sessions (s):', report.sampleShort.join(', '));
  console.log('Sample long sessions (s):', report.sampleLong.join(', '));

  // Compute averages
  function avg(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a,b) => a+b, 0) / arr.length;
  }
  const allAvg = avg(report.allDurations);
  const filtered = report.allDurations.filter(d => d >= 60);
  const filteredAvg = avg(filtered);
  console.log('\nAverage (all sessions):', Math.round(allAvg), 's');
  console.log('Average (>=60s):', Math.round(filteredAvg), 's');
  console.log('Count used for >=60s average:', filtered.length);
}

analyze();
