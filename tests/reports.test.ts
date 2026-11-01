import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportReasons, reportOutcomes } from '../shared/reports';
test('report reasons and outcomes remain canonical', () => {
  assert.equal(new Set(reportReasons).size, 5);
  assert.equal(reportReasons.includes('Misleading claim'), true);
  assert.deepEqual(reportOutcomes, ['Fixed', 'No issue found', 'Archived']);
});
test('report resolution notifies and audits in the same transaction', () => {
  const sql = readFileSync('db/migrations/018_member_reports.sql', 'utf8');
  assert.match(sql, /UNIQUE\(reporter_id,kind,item_id\)/);
  assert.match(sql, /OLD.status='open' AND NEW.status='resolved'/);
  assert.match(sql, /mobile_inbox_put/);
  assert.match(sql, /INSERT INTO mobile_content_audit/);
  assert.match(sql, /REFERENCES users\(id\) ON DELETE CASCADE/);
});
