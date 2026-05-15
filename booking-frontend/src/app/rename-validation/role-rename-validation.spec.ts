/**
 * FE-ROLE-UNIFY: userType → role Rename Validation Tests
 *
 * RED PHASE: These tests validate the TARGET state where all frontend code
 * uses `role` instead of `userType`. Since the current codebase still uses
 * `userType`, ALL tests in this file are expected to FAIL.
 *
 * After GREEN phase completes (all userType → role renames), these tests
 * should ALL PASS.
 */
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Helper: scan source files for userType references
// ============================================

interface ScanResult {
  file: string;
  matchCount: number;
}

/**
 * Scan a directory recursively for files matching the given pattern
 * and check for userType/UserType references.
 * Returns files that contain userType.
 */
function scanForUserType(
  dirPath: string,
  filePattern: RegExp,
  excludePattern?: RegExp
): ScanResult[] {
  const results: ScanResult[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanForUserType(fullPath, filePattern, excludePattern));
      }
    } else if (entry.isFile()) {
      if (filePattern.test(entry.name) && (!excludePattern || !excludePattern.test(entry.name))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Count userType occurrences (not in comments or test descriptions)
        const matches = content.match(/userType/g);
        if (matches && matches.length > 0) {
          results.push({ file: fullPath, matchCount: matches.length });
        }
      }
    }
  }

  return results;
}

// Directory to scan
// __dirname = .../booking-frontend/src/app/rename-validation/
// ../..  → .../booking-frontend/src/
const SRC_DIR = path.resolve(__dirname, '../../');
const APP_SRC = path.resolve(SRC_DIR, 'app');

// ============================================
// 1. User Interface Contract Tests
// ============================================

describe('[RoleRename] User Interface / AuthStore contract', () => {
  describe('User interface should use role not userType', () => {
    it('should expose role field on User interface (NOT userType) [RED]', () => {
      // TARGET: User interface has `role: string` instead of `userType: string`
      // CURRENT: auth.store.ts line 15 has `userType: string;`
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // TARGET: interface has `role:` not `userType:`
      // This assertion expects `role:` to exist — it DOES NOT currently
      expect(content).toContain('role:');
    });

    it('should NOT have userType field in User interface [RED]', () => {
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // Extract the User interface definition
      const userInterfaceMatch = content.match(/export interface User \{[\s\S]*?^\}/m);
      expect(userInterfaceMatch).not.toBeNull();

      if (userInterfaceMatch) {
        const userInterface = userInterfaceMatch[0];
        // TARGET: User interface should NOT contain userType
        // CURRENT: it DOES contain userType — this assertion FAILS
        expect(userInterface).not.toContain('userType');
      }
    });
  });

  describe('AuthStore.fetchUserProfile() should use role', () => {
    it('should map role from profile, not userType [RED]', () => {
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // TARGET: fetchUserProfile maps `role: profile.role`
      // CURRENT: maps `userType: profile.userType`
      // This assertion expects `profile.role` — it currently reads `profile.userType`
      expect(content).toContain('profile.role');
    });

    it('should NOT reference profile.userType in fetchUserProfile [RED]', () => {
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // TARGET: no reference to profile.userType
      // CURRENT: line 187 has `userType: profile.userType,`
      // This FAILS because userType is still referenced
      expect(content).not.toContain('profile.userType');
    });
  });

  describe('AuthStore.setUserProfile() should accept role', () => {
    it('User interface in source should NOT reference userType [RED] fails because it does', () => {
      // TARGET: User interface has `role` not `userType`
      // CURRENT: User interface has `userType: string`
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');
      const userIfaceMatch = content.match(/export interface User \{[\s\S]*?^\}/m);
      expect(userIfaceMatch).not.toBeNull();
      if (userIfaceMatch) {
        const iface = userIfaceMatch[0];
        // TARGET: no userType in User interface
        // CURRENT: has userType: string → this FAILS
        expect(iface).not.toContain('userType');
      }
    });

    it('User interface should contain role field [RED] fails because it uses userType', () => {
      // TARGET: User interface has `role: string`
      // CURRENT: User interface has `userType: string` not `role: string`
      const storePath = path.resolve(APP_SRC, 'stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');
      const userIfaceMatch = content.match(/export interface User \{[\s\S]*?^\}/m);
      expect(userIfaceMatch).not.toBeNull();
      if (userIfaceMatch) {
        const iface = userIfaceMatch[0];
        // TARGET: has role in interface
        // CURRENT: has userType, not role → this FAILS
        expect(iface).not.toContain('userType');
      }
    });
  });
});

// ============================================
// 2. ApiService Contract Tests
// ============================================

describe('[RoleRename] ApiService contracts', () => {
  it('getUserProfile() should return role not userType [RED]', () => {
    const apiPath = path.resolve(APP_SRC, 'core/services/api.service.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');

    // TARGET: getUserProfile return type uses `role: string`
    // CURRENT: uses `userType: string` within the method body
    // Extract the method by finding getUserProfile and looking for userType after it
    const methodStart = content.indexOf('getUserProfile():');
    expect(methodStart).toBeGreaterThanOrEqual(0);

    // Find the next method at the same indentation level after getUserProfile
    // by locating '  }' (two-space indent closing brace of the method)
    const lines = content.substring(methodStart).split('\n');
    let braceDepth = 0;
    let methodEndLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth === 0 && line.trim() === '}') {
        methodEndLine = i;
        break;
      }
    }
    expect(methodEndLine).toBeGreaterThan(0);
    const methodBody = lines.slice(0, methodEndLine + 1).join('\n');

    // TARGET: method body should NOT contain userType
    // CURRENT: method body still uses userType → this FAILS
    expect(methodBody).not.toContain('userType');
  });

  it('getUserProfile() return type should contain role field [RED]', () => {
    const apiPath = path.resolve(APP_SRC, 'core/services/api.service.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');

    // Find the getUserProfile method and extract the return type portion
    const methodIdx = content.indexOf('getUserProfile():');
    expect(methodIdx).toBeGreaterThanOrEqual(0);

    // Extract from method signature to the body opening brace
    const methodPortion = content.substring(methodIdx, methodIdx + 500);
    // TARGET: method return type should reference `role`
    // CURRENT: references `userType`
    expect(methodPortion).toContain('role');
  });

  it('updateProfile() response type should use role not userType [RED]', () => {
    const apiPath = path.resolve(APP_SRC, 'core/services/api.service.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');

    // TARGET: updateProfile response uses `role` not `userType`
    // CURRENT: uses `userType` on lines 293, 295
    expect(content).not.toContain('userType: string; createdAt?');
  });
});

// ============================================
// 3. Source Code Scan — Zero Tolerance
// ============================================

describe('[RoleRename] Source code scan — no userType in non-spec files', () => {
  const IGNORE_PATTERN = /\.spec\.ts$/;

  it('should have ZERO .ts source files (except spec) containing userType [RED]', () => {
    // TARGET: zero .ts source files (non-spec) contain userType
    // CURRENT: at least 6+ source files contain userType
    // This WILL FAIL during RED phase
    const tsResults = scanForUserType(APP_SRC, /\.ts$/, IGNORE_PATTERN);

    const sourceFilesWithUserType = tsResults
      .filter(r => !r.file.endsWith('.spec.ts'))
      .map(r => ({
        file: path.relative(SRC_DIR, r.file),
        count: r.matchCount,
      }));

    // TARGET: empty array — NO source files reference userType
    // CURRENT: multiple files reference userType
    expect(sourceFilesWithUserType).toEqual([]);
  });

  it('should have ZERO .html template files containing userType [RED]', () => {
    // TARGET: zero .html files contain userType
    // CURRENT: profile.component.html has `u.userType` on lines 23, 89
    const htmlResults = scanForUserType(APP_SRC, /\.html$/);

    const templateFilesWithUserType = htmlResults.map(r => ({
      file: path.relative(SRC_DIR, r.file),
      count: r.matchCount,
    }));

    // TARGET: empty array — NO template files reference userType
    // CURRENT: profile.component.html has userType references
    expect(templateFilesWithUserType).toEqual([]);
  });

  it('should verify SPECIFIC source files have no userType [RED]', () => {
    const criticalFiles = [
      'stores/auth/auth.store.ts',
      'core/services/api.service.ts',
      'core/config/routing.config.ts',
      'core/guards/role.guard.ts',
      'core/guards/guest.guard.ts',
      'shared/components/layouts/app-layout/app-layout.component.ts',
      'shared/pages/not-found-page/not-found-page.component.ts',
      'features/auth/login/login.component.ts',
      'features/auth/register/register.component.ts',
      'features/profile/profile.component.ts',
      'features/profile/profile.component.html',
    ];

    const violations: string[] = [];
    for (const relativePath of criticalFiles) {
      const fullPath = path.resolve(APP_SRC, relativePath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('userType')) {
          violations.push(relativePath);
        }
      } catch {
        violations.push(`${relativePath} (not found)`);
      }
    }

    // TARGET: empty array — NO critical files reference userType
    // CURRENT: ALL these files still reference userType
    expect(violations).toEqual([]);
  });
});

// ============================================
// 4. Routing Configuration Tests
// ============================================

describe('[RoleRename] Routing config and guards', () => {
  it('routing.config.ts getDefaultRoute should use user.role not user.userType [RED]', () => {
    const configPath = path.resolve(APP_SRC, 'core/config/routing.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');

    // TARGET: references `user.role` not `user.userType`
    // CURRENT: line 11 has `ROLE_ROUTES[user.userType]`
    expect(content).not.toContain('user.userType');
  });

  it('routing.config.ts getDefaultRoute should reference user.role [RED]', () => {
    const configPath = path.resolve(APP_SRC, 'core/config/routing.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');

    // TARGET: uses `user.role` for lookup
    // CURRENT: uses `user.userType`
    expect(content).toContain('user.role');
  });

  it('role.guard.ts should use user.role not user.userType [RED]', () => {
    const guardPath = path.resolve(APP_SRC, 'core/guards/role.guard.ts');
    const content = fs.readFileSync(guardPath, 'utf-8');

    // TARGET: references `user.role`
    // CURRENT: references `user.userType` on lines 20 and 25
    expect(content).not.toContain('user.userType');
  });

  it('role.guard.ts should reference user.role [RED]', () => {
    const guardPath = path.resolve(APP_SRC, 'core/guards/role.guard.ts');
    const content = fs.readFileSync(guardPath, 'utf-8');

    // TARGET: uses `user.role` for role comparison
    // CURRENT: uses `user.userType`
    expect(content).toContain('user.role');
  });

  it('guest.guard.ts should use user.role not user.userType [RED]', () => {
    const guardPath = path.resolve(APP_SRC, 'core/guards/guest.guard.ts');
    const content = fs.readFileSync(guardPath, 'utf-8');

    // TARGET: passes `user.role` to getPostLoginRoute
    // CURRENT: passes `currentUser()?.userType` on line 20
    expect(content).not.toContain('currentUser()?.userType');
  });
});

// ============================================
// 5. Component Behavior Tests
// ============================================

describe('[RoleRename] Component behavior', () => {
  it('NotFoundPageComponent goHome() should read user.role not user.userType [RED]', () => {
    const notFoundPath = path.resolve(APP_SRC, 'shared/pages/not-found-page/not-found-page.component.ts');
    const content = fs.readFileSync(notFoundPath, 'utf-8');

    // TARGET: reads `currentUser()?.role`
    // CURRENT: reads `currentUser()?.userType` on line 17
    expect(content).toContain('currentUser()?.role');
  });

  it('NotFoundPageComponent goHome() should NOT reference user.userType [RED]', () => {
    const notFoundPath = path.resolve(APP_SRC, 'shared/pages/not-found-page/not-found-page.component.ts');
    const content = fs.readFileSync(notFoundPath, 'utf-8');

    // TARGET: no reference to userType
    // CURRENT: line 17 references userType
    expect(content).not.toContain('currentUser()?.userType');
  });

  it('LoginComponent should pass role not userType to setUserProfile [RED]', () => {
    const loginPath = path.resolve(APP_SRC, 'features/auth/login/login.component.ts');
    const content = fs.readFileSync(loginPath, 'utf-8');

    // TARGET: setUserProfile receives `role: profile.role`
    // CURRENT: receives `userType: profile.userType` on line 178, 263
    expect(content).not.toContain('userType: profile.userType');
  });

  it('LoginComponent should call getPostLoginRoute with role [RED]', () => {
    const loginPath = path.resolve(APP_SRC, 'features/auth/login/login.component.ts');
    const content = fs.readFileSync(loginPath, 'utf-8');

    // TARGET: getPostLoginRoute receives profile.role
    // CURRENT: receives profile.userType on line 185, 270
    expect(content).not.toContain('getPostLoginRoute(profile.userType)');
  });

  it('RegisterComponent should pass role not userType to setUserProfile [RED]', () => {
    const registerPath = path.resolve(APP_SRC, 'features/auth/register/register.component.ts');
    const content = fs.readFileSync(registerPath, 'utf-8');

    // TARGET: setUserProfile receives `role: profile.role`
    // CURRENT: receives `userType: profile.userType` on line 208
    expect(content).not.toContain('userType: profile.userType');
  });

  it('RegisterComponent should call getPostLoginRoute with role [RED]', () => {
    const registerPath = path.resolve(APP_SRC, 'features/auth/register/register.component.ts');
    const content = fs.readFileSync(registerPath, 'utf-8');

    // TARGET: getPostLoginRoute receives profile.role
    // CURRENT: receives profile.userType on line 215
    expect(content).not.toContain('getPostLoginRoute(profile.userType)');
  });

  it('ProfileComponent template should use u.role not u.userType [RED]', () => {
    const templatePath = path.resolve(APP_SRC, 'features/profile/profile.component.html');
    const content = fs.readFileSync(templatePath, 'utf-8');

    // TARGET: template references `u.role` not `u.userType`
    // CURRENT: lines 23, 89 reference `u.userType`
    expect(content).not.toContain('u.userType');
  });

  it('ProfileComponent template should reference u.role [RED]', () => {
    const templatePath = path.resolve(APP_SRC, 'features/profile/profile.component.html');
    const content = fs.readFileSync(templatePath, 'utf-8');

    // TARGET: template uses `u.role` for role display
    // CURRENT: uses `u.userType`
    expect(content).toContain('u.role');
  });

  it('ProfileComponent saveProfile() should use response.user.role not userType [RED]', () => {
    const profilePath = path.resolve(APP_SRC, 'features/profile/profile.component.ts');
    const content = fs.readFileSync(profilePath, 'utf-8');

    // TARGET: references `response.user.role`
    // CURRENT: references `response.user.userType` on line 85
    expect(content).not.toContain('response.user.userType');
  });

  it('AppLayoutComponent should use userRole from user.role not user.userType [RED]', () => {
    const layoutPath = path.resolve(APP_SRC, 'shared/components/layouts/app-layout/app-layout.component.ts');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    // TARGET: userRole computed reads `user()?.role`
    // CURRENT: reads `user()?.userType` on line 31
    expect(content).not.toContain('user()?.userType');
  });

  it('AppLayoutComponent userRole should reference role [RED]', () => {
    const layoutPath = path.resolve(APP_SRC, 'shared/components/layouts/app-layout/app-layout.component.ts');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    // TARGET: userRole computed reads `user()?.role`
    // CURRENT: reads `user()?.userType`
    expect(content).toContain('user()?.role');
  });
});
