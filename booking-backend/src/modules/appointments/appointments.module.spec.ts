describe('AppointmentsModule (Module Naming)', () => {
  it('should import AppointmentsModule without error', () => {
    // Verify the module can be imported from the new plural filename
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./appointments.module');
    expect(mod.AppointmentsModule).toBeDefined();
  });
});
