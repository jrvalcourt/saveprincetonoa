/**
 * Supporter list backend for saveprincetonoa.com
 *
 * Stores supporters' names and optional messages in the Google Sheet this script is bound to,
 * and serves the public list back to the website.
 * Setup steps are in README.md ("Connect the message sheet").
 *
 * Sheet columns:
 *   Timestamp | Name | Affiliation | Class year | OA involvement | Email |
 *   Comment | Show publicly | Hidden | Approved
 *
 * To remove a message from the site: tick its "Hidden" box.
 * To review every message before it appears: set REQUIRE_APPROVAL = true,
 * then tick "Approved" on each row you want shown (and counted).
 */

var SHEET_NAME = 'Signatures';
var REQUIRE_APPROVAL = false;
var CACHE_SECONDS = 60;

var HEADERS = ['Timestamp', 'Name', 'Affiliation', 'Class year', 'OA involvement',
  'Email', 'Comment', 'Show publicly', 'Hidden', 'Approved'];
var COL = { ts: 0, name: 1, aff: 2, year: 3, oa: 4, email: 5, comment: 6, pub: 7, hidden: 8, approved: 9 };

var AFFILIATIONS = ['alum', 'grad', 'student', 'gradstudent', 'parent', 'facstaff', 'friend'];
var OA_ROLES = ['', 'trip', 'leader', 'trainer', 'none'];

/** Run once from the Apps Script editor to create the header row. */
function setup() {
  var sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(2, COL.pub + 1, sheet.getMaxRows() - 1, 3).insertCheckboxes();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Prevent spreadsheet formula injection from user-supplied text. */
function clean_(value, maxLen) {
  var s = String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (maxLen) s = s.slice(0, maxLen);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

/** GET: public list of messages. */
function doGet() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('signers');
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);

  var sheet = getSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  var count = 0;
  var signatures = [];
  rows.forEach(function (r) {
    if (!r[COL.name]) return;
    if (isTrue_(r[COL.hidden])) return;
    if (REQUIRE_APPROVAL && !isTrue_(r[COL.approved])) return;
    count++;
    if (!isTrue_(r[COL.pub])) return;
    signatures.push({
      name: String(r[COL.name]).replace(/^'/, ''),
      affiliation: String(r[COL.aff]),
      classYear: String(r[COL.year] || ''),
      oaRole: String(r[COL.oa] || ''),
      comment: String(r[COL.comment] || '').replace(/^'/, '')
    });
  });

  var body = JSON.stringify({ ok: true, count: count, signatures: signatures });
  try { cache.put('signers', body, CACHE_SECONDS); } catch (e) { /* too large to cache; fine */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/** POST: add or update a message. */
function doPost(e) {
  var p = (e && e.parameter) || {};

  // Honeypot: real visitors never fill this in. Pretend success for bots.
  if (p.website) return json_({ ok: true });

  var name = clean_(p.name, 80);
  var aff = AFFILIATIONS.indexOf(p.affiliation) >= 0 ? p.affiliation : '';
  var year = String(p.classYear || '').trim();
  var oa = OA_ROLES.indexOf(p.oaRole || '') >= 0 ? (p.oaRole || '') : '';
  var email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  var comment = clean_(p.comment, 500);
  var pub = true; // every message is public; untick "Show publicly" in the sheet to unlist one by hand

  if (name.length < 2) return json_({ ok: false, error: 'Enter your full name.' });
  if (!aff) return json_({ ok: false, error: 'Choose your connection to Princeton.' });
  if (year && !/^\d{4}$/.test(year)) return json_({ ok: false, error: 'Enter a four-digit year, like 2012.' });
  if ((aff === 'alum' || aff === 'student' || aff === 'grad' || aff === 'gradstudent') && !year) {
    return json_({ ok: false, error: 'Enter your class year.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ ok: false, error: 'Check your email address, or leave it blank.' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, error: 'The message board is busy. Try again in a moment.' });
  }

  try {
    var sheet = getSheet_();
    var row = [new Date(), name, aff, year, oa, email, comment, pub, false, false];

    // Email is optional. When given, one entry per email address: adding again updates the existing row.
    var last = sheet.getLastRow();
    var updated = false;
    if (email && last > 1) {
      var emails = sheet.getRange(2, COL.email + 1, last - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).toLowerCase() === email) {
          var rowNum = i + 2;
          var existing = sheet.getRange(rowNum, 1, 1, HEADERS.length).getValues()[0];
          row[COL.hidden] = existing[COL.hidden] === true;      // keep moderation decisions
          row[COL.approved] = existing[COL.approved] === true;
          sheet.getRange(rowNum, 1, 1, HEADERS.length).setValues([row]);
          updated = true;
          break;
        }
      }
    }
    if (!updated) sheet.appendRow(row);

    CacheService.getScriptCache().remove('signers');
    return json_({ ok: true, updated: updated });
  } finally {
    lock.releaseLock();
  }
}
