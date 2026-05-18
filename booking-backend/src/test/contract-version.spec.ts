import * as fs from 'fs';
import * as path from 'path';

describe('Contract.yaml v1.7.6', () => {
  const contractPath = path.resolve(__dirname, '../../../contract.yaml');

  let contractContent: string;

  beforeAll(() => {
    contractContent = fs.readFileSync(contractPath, 'utf-8');
  });

  it('[RED] should have version v1.7.6 after contract update (currently v1.7.5)', () => {
    // Cross-doc consistency plan Phase 1: contract.yaml must be updated to v1.7.6
    // This will FAIL because the contract is still at v1.7.5
    const versionMatch = contractContent.match(/^# Version:\s*(\S+)$/m);
    expect(versionMatch).not.toBeNull();
    const version = versionMatch![1];
    expect(version).toBe('1.7.6');
  });

  it('[RED] should have keystone state hash header present', () => {
    // The x-keystone-state-hash header must be present and non-empty
    const headerMatch = contractContent.match(/^# x-keystone-state-hash:\s*(.+)$/m);
    expect(headerMatch).not.toBeNull();
    expect(headerMatch![1].trim()).toBeTruthy();
  });
});
